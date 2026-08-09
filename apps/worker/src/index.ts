import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { interpretHumanDirective, llmEnabled, runStepWithLlm, suggestNextHints } from "./llm.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, "../../../.env") });
config();

const API_URL = process.env.API_URL || "http://127.0.0.1:4010";
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
  gate: null | { id: string; title: string; description: string; status: string; options?: string[] };
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

async function fetchRoom(roomId: string) {
  return fetch(`${API_URL}/api/rooms/${roomId}`).then((r) => r.json()) as Promise<{
    room: Room;
    events: RoomEvent[];
  }>;
}

function collectSteers(events: RoomEvent[]) {
  return events
    .filter((e) => e.type === "steer")
    .map((e) => `${e.actorName || "Human"}: ${String(e.payload.message || e.payload.note || "")}`);
}

function collectFindings(events: RoomEvent[]) {
  return events
    .filter((e) => e.type === "step.tool" && e.payload.tool !== "agent.error")
    .map((e) => `${e.payload.tool}: ${e.payload.detail}\n→ ${e.payload.result}`);
}

function isDecisionStep(title: string) {
  return /hypothes|options|tone|choose|lay out|propose why/i.test(title);
}

function isPublishGate(title: string) {
  return /pull request|send customer update/i.test(title);
}

function applyCancels(plan: PlanStep[], cancelRefs?: string[]) {
  if (!cancelRefs?.length) return plan;
  const lower = cancelRefs.map((t) => t.toLowerCase());
  return plan.map((s) => {
    if (s.status === "cancelled" || s.status === "done" || s.status === "skipped") return s;
    const hit = lower.some(
      (t) =>
        t === s.id.toLowerCase() ||
        s.title.toLowerCase().includes(t) ||
        t.includes(s.title.toLowerCase()) ||
        (t.includes("pr") && /pull request/i.test(s.title)) ||
        (t.includes("pull request") && /pull request/i.test(s.title)),
    );
    return hit ? { ...s, status: "cancelled" as const } : s;
  });
}

function cancelsFromDirective(directive: string, plan: PlanStep[]): string[] {
  if (!/skip (the )?pr|no pr|don'?t open (a )?pr|without (a )?pr|draft only|skip.*(pull request)/i.test(directive)) {
    return [];
  }
  return plan.filter((s) => /pull request/i.test(s.title)).map((s) => s.id);
}

async function yieldToHumans(roomId: string, question: string, hints: string[]) {
  await postEvent(roomId, {
    type: "ask.human",
    status: "awaiting_human",
    payload: { question, hints },
  });
}

async function executeOneStep(
  room: Room,
  events: RoomEvent[],
  idx: number,
  plan: PlanStep[],
  forceDecision: boolean,
) {
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

  const llmResult = await runStepWithLlm({
    roomTitle: room.title,
    templateId: room.templateId,
    stepTitle: step.title,
    priorFindings: collectFindings(events),
    steers: collectSteers(events),
    forceDecision: forceDecision || isDecisionStep(step.title),
  });

  plan = applyCancels(plan, llmResult.cancelStepIds);

  // Ship a concrete artifact for PR / send steps so the room has something to approve
  let artifactUrl: string | undefined;
  if (/pull request/i.test(step.title)) {
    artifactUrl = `https://github.com/acme/checkout/pull/${512 + Math.floor(Math.random() * 40)}`;
    llmResult.tool = "github.pr";
    llmResult.detail = "gh pr create --draft --fill";
    llmResult.result = [
      "Draft PR opened for the room to review:",
      artifactUrl,
      "",
      "Title: fix(checkout): guard null tax/total on guest path",
      "Body: Prevents 500s when tax calculator returns null after promo stacking.",
      "Files: packages/checkout/tax.ts, packages/checkout/guest.ts",
    ].join("\n");
  } else if (/send customer update/i.test(step.title)) {
    artifactUrl = `https://status.acme.dev/incidents/pd-demo-${Date.now().toString(36).slice(-4)}`;
    llmResult.tool = "status.page";
    llmResult.result = [
      "Draft status update ready:",
      artifactUrl,
      "",
      llmResult.result.slice(0, 400),
    ].join("\n");
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
      url: artifactUrl,
    },
  });

  if (isPublishGate(step.title)) {
    await postEvent(room.id, {
      type: "gate.requested",
      currentStepIndex: idx,
      plan,
      status: "needs_you",
      gate: {
        id: `gate-${step.id}`,
        title: artifactUrl ? `Publish? ${artifactUrl}` : step.title,
        description:
          llmResult.gateDescription ||
          (artifactUrl
            ? `Review the draft artifact, then approve to mark it published for the room.\n${artifactUrl}`
            : llmResult.result.slice(0, 600)),
        status: "open",
        options: artifactUrl
          ? [`Approve & share ${artifactUrl}`, "Reject — revise first"]
          : ["Approve send/open", "Reject — revise first"],
      },
      payload: { stepId: step.id, title: step.title, url: artifactUrl },
    });
    return { yielded: true, plan, idx };
  }

  if (llmResult.askHuman?.question || isDecisionStep(step.title)) {
    const options = llmResult.askHuman?.options || ["Option A", "Option B", "Something else — I'll type it"];
    await postEvent(room.id, {
      type: "gate.requested",
      currentStepIndex: idx,
      plan,
      status: "needs_you",
      gate: {
        id: `decide-${step.id}`,
        title: llmResult.askHuman?.question || "Room decision needed",
        description: llmResult.result.slice(0, 800),
        status: "open",
        options,
      },
      payload: { stepId: step.id, decision: true },
    });
    return { yielded: true, plan, idx };
  }

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

  return { yielded: false, plan, idx: idx + 1 };
}

async function handleAwaitingHuman(room: Room, events: RoomEvent[]) {
  const pending = events.filter((e) => e.type === "steer" && !e.payload.agentAcked && !e.payload.takeover);
  if (!pending.length) return;

  if (!llmEnabled()) {
    await postEvent(room.id, {
      type: "step.tool",
      status: "awaiting_human",
      payload: {
        tool: "agent.error",
        detail: "OPENAI_API_KEY missing",
        result: "Set the key in .env and restart npm run dev",
      },
    });
    return;
  }

  const directive = pending.map((e) => String(e.payload.message || "")).join("\n");
  const interpreted = await interpretHumanDirective({
    roomTitle: room.title,
    templateId: room.templateId,
    directive,
    planTitles: room.plan.map((p) => p.title),
    priorFindings: collectFindings(events),
  });

  await fetch(`${API_URL}/internal/rooms/${room.id}/ack-steers`, { method: "POST" });

  // Real agent reply in the chat (not a fake "heard you" meta line)
  await postEvent(room.id, {
    type: "step.tool",
    payload: {
      tool: "agent.reply",
      detail: "",
      result: interpreted.reply,
    },
  });

  const steerer =
    pending.map((e) => e.actorName).filter(Boolean).slice(-1)[0] || "Someone";
  const cancelRefs = [
    ...(interpreted.cancelStepIds || []),
    ...cancelsFromDirective(directive, room.plan),
  ];
  let plan = applyCancels(room.plan, cancelRefs);
  const cancelled = plan.filter((s, i) => s.status === "cancelled" && room.plan[i]?.status !== "cancelled");
  if (cancelled.length) {
    await postEvent(room.id, {
      type: "step.tool",
      plan,
      payload: {
        tool: "plan.redirect",
        detail: steerer,
        result: `${steerer} redirected the shared run — cancelled: ${cancelled.map((s) => s.title).join(", ")}. Everyone in the room sees this.`,
      },
    });
  } else {
    await postEvent(room.id, { type: "plan.updated", plan, payload: { plan } });
  }

  if (interpreted.done) {
    await postEvent(room.id, {
      type: "room.updated",
      status: "done",
      plan,
      summary: interpreted.reply,
      payload: { status: "done", summary: interpreted.reply },
    });
    await fetch(`${API_URL}/internal/rooms/${room.id}/resolved`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ summary: interpreted.reply }),
    }).catch(() => undefined);
    return;
  }

  const snap = await fetchRoom(room.id);
  plan = snap.room.plan;
  let idx = snap.room.currentStepIndex;

  if (interpreted.runStepTitle) {
    const found = plan.findIndex(
      (p) =>
        p.status !== "cancelled" &&
        (p.title.toLowerCase().includes(interpreted.runStepTitle!.toLowerCase()) ||
          interpreted.runStepTitle!.toLowerCase().includes(p.title.toLowerCase())),
    );
    if (found >= 0) idx = found;
  }

  if (interpreted.customAction) {
    await postEvent(room.id, {
      type: "step.started",
      status: "running",
      currentStepIndex: idx,
      plan,
      payload: { title: "Human-directed action" },
    });
    const custom = await runStepWithLlm({
      roomTitle: room.title,
      templateId: room.templateId,
      stepTitle: interpreted.customAction,
      priorFindings: collectFindings(snap.events),
      steers: [directive],
    });
    await postEvent(room.id, {
      type: "step.tool",
      payload: {
        tool: custom.tool,
        detail: custom.detail,
        result: custom.result,
        thinking: custom.thinking,
      },
    });
    const hints = await suggestNextHints({
      priorFindings: collectFindings((await fetchRoom(room.id)).events),
      planTitles: plan.map((p) => p.title),
    });
    await yieldToHumans(room.id, "Done with that instruction. What's next?", hints);
    return;
  }

  while (idx < plan.length && (plan[idx].status === "cancelled" || plan[idx].status === "skipped")) idx += 1;
  if (idx >= plan.length) {
    await postEvent(room.id, {
      type: "room.updated",
      status: "done",
      plan,
      summary: interpreted.reply,
      payload: { status: "done" },
    });
    return;
  }

  const result = await executeOneStep(snap.room, snap.events, idx, plan, false);
  if (result.yielded) return;

  const hints = await suggestNextHints({
    priorFindings: collectFindings((await fetchRoom(room.id)).events),
    planTitles: result.plan.map((p) => p.title),
  });
  await yieldToHumans(room.id, "Your move — agent is waiting on the room.", hints);
}

async function runOpeningBeat(room: Room) {
  if (!llmEnabled()) {
    await postEvent(room.id, {
      type: "step.tool",
      status: "awaiting_human",
      payload: {
        tool: "agent.error",
        detail: "OPENAI_API_KEY missing",
        result: "Set OPENAI_API_KEY in .env then restart.",
      },
    });
    return;
  }

  const snap = await fetchRoom(room.id);
  let plan = snap.room.plan.map((s) => ({ ...s }));
  let idx = snap.room.currentStepIndex;
  while (idx < plan.length && (plan[idx].status === "cancelled" || plan[idx].status === "skipped")) idx += 1;
  if (idx >= plan.length) {
    await postEvent(room.id, { type: "room.updated", status: "done", payload: { status: "done" } });
    return;
  }

  // First beat always forces a decision point after the step (pair programming feel)
  const forceDecision = idx <= 1 || isDecisionStep(plan[idx].title);
  const result = await executeOneStep(snap.room, snap.events, idx, plan, forceDecision);
  if (result.yielded) return;

  const hints = await suggestNextHints({
    priorFindings: collectFindings((await fetchRoom(room.id)).events),
    planTitles: result.plan.map((p) => p.title),
  });
  await yieldToHumans(
    room.id,
    "Agent finished a beat. Room decides what happens next — steer or pick a hint.",
    hints,
  );
}

async function loop() {
  console.log(`Room worker polling ${API_URL}`);
  console.log(llmEnabled() ? `OpenAI on (${process.env.OPENAI_MODEL || "gpt-4o-mini"})` : "OpenAI OFF — set OPENAI_API_KEY");
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
      const data = (await res.json()) as { room: Room; events?: RoomEvent[] };
      const snap = await fetchRoom(data.room.id);
      if (snap.room.status === "awaiting_human") {
        await handleAwaitingHuman(snap.room, snap.events);
      } else if (snap.room.status === "running") {
        await runOpeningBeat(snap.room);
      }
    } catch (err) {
      console.error("worker tick failed", err);
      await sleep(1500);
    }
  }
}

loop();
