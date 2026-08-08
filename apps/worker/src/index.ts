import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { llmEnabled, reactToSteerWithLlm, runStepWithLlm } from "./llm.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, "../../../.env") });
config(); // also local cwd .env

const API_URL = process.env.API_URL || "http://127.0.0.1:4000";
const POLL_MS = Number(process.env.POLL_MS || 800);

type PlanStep = {
  id: string;
  title: string;
  status: "pending" | "active" | "done" | "cancelled" | "skipped";
};

type RoomEvent = {
  type: string;
  payload: Record<string, unknown>;
  actorName?: string;
};

type Room = {
  id: string;
  title: string;
  templateId: string;
  status: string;
  plan: PlanStep[];
  currentStepIndex: number;
  gate: null | { id: string; title: string; description: string; status: string };
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function postEvent(roomId: string, body: Record<string, unknown>) {
  const res = await fetch(`${API_URL}/internal/rooms/${roomId}/events`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`event failed ${res.status}`);
  return res.json();
}

function isGated(title: string) {
  return /pull request|send customer update/i.test(title);
}

function collectSteers(events: RoomEvent[]) {
  return events
    .filter((e) => e.type === "steer")
    .map((e) => `${e.actorName || "Human"}: ${String(e.payload.message || e.payload.note || "")}`);
}

function collectFindings(events: RoomEvent[]) {
  return events
    .filter((e) => e.type === "step.tool")
    .map((e) => `${e.payload.tool}: ${e.payload.detail}\n→ ${e.payload.result}`);
}

function applyCancels(plan: PlanStep[], titles?: string[]) {
  if (!titles?.length) return plan;
  const lower = titles.map((t) => t.toLowerCase());
  return plan.map((s) => {
    if (s.status === "pending" && lower.some((t) => s.title.toLowerCase().includes(t) || t.includes(s.title.toLowerCase()))) {
      return { ...s, status: "cancelled" as const };
    }
    return s;
  });
}

async function processPendingSteers(roomId: string, room: Room, events: RoomEvent[], priorFindings: string[]) {
  const pending = events.filter((e) => e.type === "steer" && !e.payload.agentAcked);
  if (!pending.length || !llmEnabled()) return { plan: room.plan, events };

  const steers = collectSteers(pending);
  const reaction = await reactToSteerWithLlm({
    roomTitle: room.title,
    steers,
    planTitles: room.plan.map((p) => p.title),
    priorFindings,
  });

  let plan = applyCancels(room.plan, reaction.cancelStepIds);

  await postEvent(roomId, {
    type: "step.tool",
    plan,
    currentStepIndex: room.currentStepIndex,
    payload: {
      tool: "agent.steer",
      detail: steers.join(" | "),
      result: reaction.reply,
      thinking: reaction.note,
    },
  });

  await fetch(`${API_URL}/internal/rooms/${roomId}/ack-steers`, { method: "POST" });

  const snap = await fetch(`${API_URL}/api/rooms/${roomId}`).then((r) => r.json());
  return { plan: (snap.room.plan as PlanStep[]) ?? plan, events: snap.events as RoomEvent[] };
}

async function runRoom(room: Room) {
  if (!llmEnabled()) {
    console.error("OPENAI_API_KEY is not set — worker will not run rooms. Add it to your env and restart.");
    await postEvent(room.id, {
      type: "step.tool",
      status: "paused",
      payload: {
        tool: "agent.error",
        detail: "missing OPENAI_API_KEY",
        result: "Set OPENAI_API_KEY in the worker environment, then resume the room.",
      },
    });
    return;
  }

  let snap = await fetch(`${API_URL}/api/rooms/${room.id}`).then((r) => r.json());
  let plan = (snap.room as Room).plan.map((s) => ({ ...s }));
  let idx = (snap.room as Room).currentStepIndex;
  let events = snap.events as RoomEvent[];

  while (idx < plan.length) {
    snap = await fetch(`${API_URL}/api/rooms/${room.id}`).then((r) => r.json());
    const live = snap.room as Room;
    events = snap.events as RoomEvent[];
    if (live.status === "paused") return;
    if (live.gate?.status === "open") return;

    const priorFindings = collectFindings(events);
    const processed = await processPendingSteers(room.id, live, events, priorFindings);
    plan = processed.plan.map((s) => ({ ...s }));
    events = processed.events;
    idx = (await fetch(`${API_URL}/api/rooms/${room.id}`).then((r) => r.json())).room.currentStepIndex;

    while (idx < plan.length && (plan[idx].status === "cancelled" || plan[idx].status === "skipped")) {
      idx += 1;
    }
    if (idx >= plan.length) break;

    const step = plan[idx];
    for (let i = 0; i < plan.length; i++) {
      if (plan[i].status === "cancelled" || plan[i].status === "skipped") continue;
      if (i < idx) plan[i].status = "done";
      else if (i === idx) plan[i].status = "active";
      else if (plan[i].status !== "cancelled") plan[i].status = "pending";
    }

    await postEvent(room.id, {
      type: "step.started",
      currentStepIndex: idx,
      plan,
      status: "running",
      payload: { stepId: step.id, title: step.title },
    });

    const steers = collectSteers(events);
    let llmResult;
    try {
      llmResult = await runStepWithLlm({
        roomTitle: live.title,
        templateId: live.templateId,
        stepTitle: step.title,
        priorFindings,
        steers,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await postEvent(room.id, {
        type: "step.tool",
        currentStepIndex: idx,
        plan,
        status: "paused",
        payload: {
          tool: "agent.error",
          detail: step.title,
          result: message,
        },
      });
      return;
    }

    plan = applyCancels(plan, llmResult.cancelStepIds);

    if (isGated(step.title)) {
      await postEvent(room.id, {
        type: "step.tool",
        currentStepIndex: idx,
        plan,
        payload: {
          stepId: step.id,
          tool: llmResult.tool,
          detail: llmResult.detail,
          result: llmResult.result,
          thinking: llmResult.thinking,
        },
      });
      await postEvent(room.id, {
        type: "gate.requested",
        currentStepIndex: idx,
        plan,
        status: "needs_you",
        gate: {
          id: `gate-${step.id}`,
          title: step.title,
          description:
            llmResult.gateDescription ||
            llmResult.result.slice(0, 500) ||
            `Agent wants to run “${step.title}”. Approve or reject.`,
          status: "open",
        },
        payload: { stepId: step.id, title: step.title },
      });
      return;
    }

    await postEvent(room.id, {
      type: "step.tool",
      currentStepIndex: idx,
      plan,
      payload: {
        stepId: step.id,
        tool: llmResult.tool,
        detail: llmResult.detail,
        result: llmResult.result,
        thinking: llmResult.thinking,
      },
    });

    plan[idx].status = "done";
    await postEvent(room.id, {
      type: "step.finished",
      currentStepIndex: idx + 1,
      plan,
      payload: { stepId: step.id, title: step.title },
    });
    await postEvent(room.id, {
      type: "checkpoint",
      currentStepIndex: idx + 1,
      plan,
      payload: { stepIndex: idx + 1 },
    });
    idx += 1;
  }

  const finalFindings = collectFindings(
    (await fetch(`${API_URL}/api/rooms/${room.id}`).then((r) => r.json())).events as RoomEvent[],
  );

  let summary = "Run complete.";
  try {
    const end = await runStepWithLlm({
      roomTitle: room.title,
      templateId: room.templateId,
      stepTitle: "Write a concise handoff summary for the team",
      priorFindings: finalFindings,
      steers: collectSteers(
        (await fetch(`${API_URL}/api/rooms/${room.id}`).then((r) => r.json())).events as RoomEvent[],
      ),
    });
    summary = end.result;
  } catch {
    /* keep default */
  }

  await postEvent(room.id, {
    type: "room.updated",
    status: "done",
    currentStepIndex: plan.length,
    plan,
    gate: null,
    summary,
    payload: { status: "done", summary },
  });
}

async function loop() {
  console.log(`Room worker polling ${API_URL}`);
  console.log(llmEnabled() ? `OpenAI enabled (${process.env.OPENAI_MODEL || "gpt-4o-mini"})` : "OpenAI DISABLED — set OPENAI_API_KEY");
  for (;;) {
    try {
      const res = await fetch(`${API_URL}/internal/jobs/claim`);
      if (res.status === 204) {
        await sleep(POLL_MS);
        continue;
      }
      if (!res.ok) {
        await sleep(POLL_MS);
        continue;
      }
      const data = (await res.json()) as { room: Room };
      if (data.room?.status === "running") {
        await runRoom(data.room);
      }
    } catch (err) {
      console.error("worker tick failed", err);
      await sleep(1500);
    }
  }
}

loop();
