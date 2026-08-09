import {
  MEMBER_COLORS,
  TEMPLATES,
  createPlan,
  emptyCanvas,
  type CanvasAction,
  type CanvasNote,
  type EventType,
  type GateState,
  type MemberRole,
  type PlanStep,
  type PresenceMode,
  type Room,
  type RoomCanvas,
  type RoomEvent,
  type RoomMember,
  type RoomStatus,
} from "@room/shared";
import { randomUUID } from "crypto";

const rooms = new Map<string, Room>();
const events = new Map<string, RoomEvent[]>();
const jobQueue: string[] = [];
const checkpoints = new Map<string, { stepIndex: number; plan: PlanStep[] }>();

function now() {
  return new Date().toISOString();
}

function appendEvent(
  roomId: string,
  type: EventType,
  payload: Record<string, unknown>,
  actor?: { id?: string; name?: string },
): RoomEvent {
  const event: RoomEvent = {
    id: randomUUID(),
    roomId,
    type,
    at: now(),
    actorId: actor?.id,
    actorName: actor?.name,
    payload,
  };
  const list = events.get(roomId) ?? [];
  list.push(event);
  events.set(roomId, list);
  const room = rooms.get(roomId);
  if (room) {
    room.updatedAt = event.at;
    rooms.set(roomId, room);
  }
  return event;
}

export function listTemplates() {
  return TEMPLATES;
}

export function listRooms(filter?: string): Room[] {
  let all = [...rooms.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  if (filter && filter !== "all") {
    if (filter === "needs_you") all = all.filter((r) => r.status === "needs_you" || r.gate?.status === "open");
    else all = all.filter((r) => r.status === filter);
  }
  return all;
}

export function getRoom(id: string) {
  return rooms.get(id) ?? null;
}

export function getEvents(roomId: string) {
  return events.get(roomId) ?? [];
}

export function createRoom(input: {
  title: string;
  templateId: string;
  ownerName: string;
}): { room: Room; event: RoomEvent } {
  const template = TEMPLATES.find((t) => t.id === input.templateId) ?? TEMPLATES[0];
  const ownerId = randomUUID();
  const id = randomUUID().slice(0, 8);
  const room: Room = {
    id,
    title: input.title || template.name,
    templateId: template.id,
    status: "pending",
    ownerId,
    ownerName: input.ownerName || "You",
    plan: createPlan(template.steps),
    currentStepIndex: 0,
    gate: null,
    members: [
      {
        id: ownerId,
        name: input.ownerName || "You",
        role: "owner",
        mode: "steering",
        color: MEMBER_COLORS[0],
        joinedAt: now(),
      },
    ],
    steersCount: 0,
    handoffsCount: 0,
    createdAt: now(),
    updatedAt: now(),
    canvas: seedTemplateContext(template.name, template.description),
  };
  rooms.set(id, room);
  events.set(id, []);
  const event = appendEvent(id, "room.updated", { status: room.status }, { id: ownerId, name: room.ownerName });
  appendEvent(
    id,
    "canvas.updated",
    { reason: "seed_template", canvas: structuredClone(room.canvas) },
    { id: ownerId, name: room.ownerName },
  );
  return { room, event };
}

function ensureCanvas(room: Room): RoomCanvas {
  if (!room.canvas) room.canvas = emptyCanvas();
  return room.canvas;
}

function seedTemplateContext(name: string, description: string): RoomCanvas {
  return {
    notes: [
      {
        id: randomUUID().slice(0, 8),
        kind: "context",
        title: "Room brief",
        body: `${name}\n\n${description}`,
        x: 40,
        y: 40,
      },
      {
        id: randomUUID().slice(0, 8),
        kind: "context",
        title: "Slack · #eng-incidents",
        body: "Connected · last sync just now\nChannel mirrored into this room for the meeting.",
        x: 40,
        y: 200,
        integration: "slack",
      },
      {
        id: randomUUID().slice(0, 8),
        kind: "context",
        title: "Google Drive · runbook",
        body: "Connected · checkout-incident.md\nShared company context for everyone on the board.",
        x: 40,
        y: 360,
        integration: "drive",
      },
      {
        id: randomUUID().slice(0, 8),
        kind: "context",
        title: "Zapier · notify on gate",
        body: "Connected · When gate approved → post to Slack + page on-call.",
        x: 40,
        y: 520,
        integration: "zapier",
      },
    ],
    edges: [],
  };
}

export function enqueueJob(roomId: string) {
  if (!jobQueue.includes(roomId)) jobQueue.push(roomId);
}

export function claimJob(): string | null {
  return jobQueue.shift() ?? null;
}

export function startRoom(roomId: string) {
  const room = rooms.get(roomId);
  if (!room) return null;
  room.status = "running";
  room.updatedAt = now();
  rooms.set(roomId, room);
  enqueueJob(roomId);
  appendEvent(roomId, "room.updated", { status: "running" });
  return room;
}

/** Slack / incident rooms: load shared context first, wait for humans, then agent works. */
export function seedIncidentBriefing(
  roomId: string,
  ticket: {
    id: string;
    severity: string;
    summary: string;
    title: string;
  },
) {
  const room = rooms.get(roomId);
  if (!room) return null;

  const canvas = ensureCanvas(room);
  const pdBody = [
    `🚨 PagerDuty · ${ticket.id}`,
    `Service: checkout`,
    `Severity: ${ticket.severity}`,
    `Error rate peaked at 25% after deploy`,
    "",
    ticket.summary,
  ].join("\n");
  const gitBody = [
    "a3f91c2  fix: guest checkout tax default when cart empty",
    "9c2e110  feat: promo code stacking on guest path",
    "e81b044  chore: bump payments SDK 4.2.1",
    "12d90aa  refactor: split tax calculator from totals",
    "6bfc331  fix: race on session recreate during pay",
    "c0a18de  Merge PR #482 — checkout redesign",
    "44ae901  test: add flaky guest tax cases",
    "b17d2ee  deploy: production checkout @ 10:05",
  ].join("\n");

  canvas.notes = [
    {
      id: randomUUID().slice(0, 8),
      kind: "context",
      title: "PagerDuty alert",
      body: pdBody,
      x: 40,
      y: 40,
      integration: "pagerduty",
    },
    {
      id: randomUUID().slice(0, 8),
      kind: "context",
      title: "GitHub · recent commits",
      body: gitBody,
      x: 40,
      y: 260,
      integration: "github",
    },
    {
      id: randomUUID().slice(0, 8),
      kind: "context",
      title: "Slack · #eng-incidents",
      body: `Connected · thread for ${ticket.id}\nRoom will post resolve summary back here.`,
      x: 40,
      y: 480,
      integration: "slack",
    },
    {
      id: randomUUID().slice(0, 8),
      kind: "context",
      title: "Google Drive · runbook",
      body: "Connected · checkout-incident.md\nShared company context for the meeting.",
      x: 280,
      y: 40,
      integration: "drive",
    },
    {
      id: randomUUID().slice(0, 8),
      kind: "context",
      title: "Zapier · notify on gate",
      body: "Connected · When gate approved → Slack + page on-call.",
      x: 280,
      y: 220,
      integration: "zapier",
    },
  ];
  canvas.edges = [];
  room.canvas = canvas;

  appendEvent(
    roomId,
    "step.tool",
    {
      tool: "pagerduty.alert",
      detail: `${ticket.severity.toUpperCase()} · ${ticket.id}`,
      result: pdBody,
    },
    { name: "PagerDuty" },
  );

  appendEvent(
    roomId,
    "step.tool",
    {
      tool: "git.log",
      detail: "git log -n 8 --oneline (checkout service, last hour)",
      result: gitBody,
      thinking: "Shared context for everyone in the room — same commits, same incident.",
    },
    { name: "Agent" },
  );

  room.status = "awaiting_human";
  room.promptHints = [
    "Investigate null tax/total path",
    "Check race on session recreate",
    "Blame the promo stacking commit",
    "Draft a fix — skip the PR for now",
  ];
  room.updatedAt = now();
  rooms.set(roomId, room);

  appendEvent(
    roomId,
    "ask.human",
    {
      question:
        "Incident loaded. Pick a path or type a steer — the agent will not continue alone. Second person can Join and redirect mid-run.",
      hints: room.promptHints,
    },
    { name: "Room" },
  );

  appendEvent(
    roomId,
    "canvas.updated",
    { reason: "seed_incident", canvas: structuredClone(canvas) },
    { name: "Room" },
  );

  return getRoom(roomId);
}

export function mutateCanvas(
  roomId: string,
  memberId: string,
  input: CanvasAction,
): { room: Room; event: RoomEvent } | { error: "forbidden" | "not_found" | "bad_request" } | null {
  const room = rooms.get(roomId);
  if (!room) return null;
  const member = room.members.find((m) => m.id === memberId);
  if (!member) return { error: "not_found" };
  if (member.role === "viewer") return { error: "forbidden" };

  const canvas = ensureCanvas(room);

  switch (input.action) {
    case "add": {
      const kind = input.kind === "context" ? "context" : "brainstorm";
      const note: CanvasNote = {
        id: randomUUID().slice(0, 8),
        kind,
        title: String(input.title || (kind === "context" ? "Context" : "Note")).slice(0, 80),
        body: String(input.body || "").slice(0, 2000),
        x: typeof input.x === "number" ? input.x : 220 + canvas.notes.length * 24,
        y: typeof input.y === "number" ? input.y : 120 + canvas.notes.length * 28,
        authorId: member.id,
      };
      canvas.notes.push(note);
      break;
    }
    case "update": {
      const note = canvas.notes.find((n) => n.id === input.noteId);
      if (!note) return { error: "bad_request" };
      if (input.title !== undefined) note.title = String(input.title).slice(0, 80);
      if (input.body !== undefined) note.body = String(input.body).slice(0, 2000);
      break;
    }
    case "move": {
      const note = canvas.notes.find((n) => n.id === input.noteId);
      if (!note) return { error: "bad_request" };
      note.x = input.x;
      note.y = input.y;
      break;
    }
    case "connect": {
      const source = String(input.source || "");
      const target = String(input.target || "");
      if (!source || !target || source === target) return { error: "bad_request" };
      const exists = canvas.edges.some((e) => e.source === source && e.target === target);
      if (!exists) {
        canvas.edges.push({ id: randomUUID().slice(0, 8), source, target });
      }
      break;
    }
    case "disconnect": {
      canvas.edges = canvas.edges.filter((e) => e.id !== input.edgeId);
      break;
    }
    case "delete": {
      canvas.notes = canvas.notes.filter((n) => n.id !== input.noteId);
      canvas.edges = canvas.edges.filter((e) => e.source !== input.noteId && e.target !== input.noteId);
      break;
    }
    case "pin-to-run": {
      const note = canvas.notes.find((n) => n.id === input.noteId);
      const step = room.plan.find((s) => s.id === input.stepId);
      if (!note || !step) return { error: "bad_request" };
      const exists = canvas.edges.some((e) => e.source === note.id && e.target === step.id);
      if (!exists) {
        canvas.edges.push({ id: randomUUID().slice(0, 8), source: note.id, target: step.id });
      }
      break;
    }
    default:
      return { error: "bad_request" };
  }

  room.canvas = canvas;
  room.updatedAt = now();
  rooms.set(roomId, room);
  const event = appendEvent(
    roomId,
    "canvas.updated",
    { action: input.action, canvas: structuredClone(canvas) },
    { id: member.id, name: member.name },
  );
  return { room: getRoom(roomId)!, event };
}

export function joinRoom(
  roomId: string,
  input: { name: string; role: MemberRole },
): { room: Room; member: RoomMember; event: RoomEvent } | null {
  const room = rooms.get(roomId);
  if (!room) return null;
  const member: RoomMember = {
    id: randomUUID(),
    name: input.name || "Teammate",
    role: input.role === "viewer" ? "viewer" : "editor",
    mode: "watching",
    color: MEMBER_COLORS[room.members.length % MEMBER_COLORS.length],
    joinedAt: now(),
  };
  room.members.push(member);
  room.updatedAt = now();
  rooms.set(roomId, room);
  const event = appendEvent(
    roomId,
    "presence.join",
    { member },
    { id: member.id, name: member.name },
  );
  return { room, member, event };
}

export function leaveRoom(roomId: string, memberId: string) {
  const room = rooms.get(roomId);
  if (!room) return null;
  room.members = room.members.filter((m) => m.id !== memberId);
  room.updatedAt = now();
  rooms.set(roomId, room);
  return appendEvent(roomId, "presence.leave", { memberId });
}

function stripUiText(value: unknown): string {
  return String(value ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function steerRoom(roomId: string, memberId: string, message: string) {
  const room = rooms.get(roomId);
  if (!room) return null;
  const member = room.members.find((m) => m.id === memberId);
  if (!member || member.role === "viewer") return { error: "forbidden" as const };

  const clean = stripUiText(message);
  if (!clean) return { error: "forbidden" as const };

  const takeOverIntent = /take over|pass (it |the agent )?to me|i'?ll (take|drive)|hand (it )?to me|give me (the )?control/i.test(
    clean,
  );

  if (takeOverIntent && room.ownerId !== memberId) {
    const handed = handoff(roomId, room.ownerId, memberId);
    if (handed && !("error" in handed)) {
      const r = getRoom(roomId)!;
      r.status = "awaiting_human";
      r.promptHints = [
        "Chase hypothesis A",
        "Chase hypothesis B",
        "Draft the fix now",
        "Skip the PR — summarize instead",
      ];
      rooms.set(roomId, r);
      appendEvent(
        roomId,
        "ask.human",
        {
          question: `${member.name} is driving. Tell the agent what to do next — it will not auto-run.`,
          hints: r.promptHints,
        },
        { id: member.id, name: member.name },
      );
      const event = appendEvent(
        roomId,
        "steer",
        { message: clean, agentAcked: true, takeover: true },
        { id: member.id, name: member.name },
      );
      return { room: getRoom(roomId)!, event };
    }
  }

  room.steersCount += 1;
  room.status = "awaiting_human";
  room.updatedAt = now();
  rooms.set(roomId, room);
  const event = appendEvent(
    roomId,
    "steer",
    { message: clean, agentAcked: false },
    { id: member.id, name: member.name },
  );
  enqueueJob(roomId);
  return { room: getRoom(roomId)!, event };
}

export function handoff(roomId: string, fromId: string, toId: string) {
  const room = rooms.get(roomId);
  if (!room) return null;
  const from = room.members.find((m) => m.id === fromId);
  const to = room.members.find((m) => m.id === toId);
  if (!from || !to) return null;
  if (from.role === "viewer") return { error: "forbidden" as const };

  for (const m of room.members) {
    if (m.id === to.id) {
      m.role = "owner";
      m.mode = "steering";
    } else if (m.id === from.id) {
      m.role = "editor";
      m.mode = "watching";
    } else if (m.mode === "steering") {
      m.mode = "watching";
    }
  }
  room.ownerId = to.id;
  room.ownerName = to.name;
  room.handoffsCount += 1;
  room.status = "awaiting_human";
  room.promptHints = [
    "What should we investigate next?",
    "Draft the customer update shorter",
    "Pick hypothesis A",
    "Continue one step",
  ];
  room.updatedAt = now();
  rooms.set(roomId, room);
  const event = appendEvent(
    roomId,
    "handoff",
    {
      fromId,
      toId,
      ownerName: to.name,
      message: `${to.name} owns the run. Agent is waiting for their next instruction.`,
    },
    { id: from.id, name: from.name },
  );
  appendEvent(roomId, "ask.human", {
    question: `${to.name} — you're driving. Type an instruction for the agent.`,
    hints: room.promptHints,
  });
  return { room, event };
}

export function takeOver(roomId: string, memberId: string) {
  const room = rooms.get(roomId);
  if (!room) return null;
  const member = room.members.find((m) => m.id === memberId);
  if (!member) return null;
  if (member.role === "viewer") return { error: "forbidden" as const };
  return handoff(roomId, room.ownerId, memberId);
}

export function resolveGate(
  roomId: string,
  memberId: string,
  decision: "approved" | "rejected",
  choice?: string,
) {
  const room = rooms.get(roomId);
  if (!room || !room.gate || room.gate.status !== "open") return null;
  const member = room.members.find((m) => m.id === memberId);
  if (!member || member.role === "viewer") return { error: "forbidden" as const };

  const gateId = room.gate.id;
  const emitted: RoomEvent[] = [];
  room.gate.status = decision;

  const cleanChoice = choice
    ? String(choice)
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    : "";

  if (cleanChoice) {
    room.steersCount += 1;
    emitted.push(
      appendEvent(
        roomId,
        "steer",
        { message: cleanChoice, agentAcked: false, fromGate: true },
        { id: member.id, name: member.name },
      ),
    );
  }

  const step = room.plan[room.currentStepIndex];
  if (step) {
    step.status = decision === "approved" ? "done" : "cancelled";
  }
  room.currentStepIndex += 1;
  room.gate = null;
  room.status = "awaiting_human";
  room.promptHints =
    decision === "approved"
      ? ["Continue to the next step", "Rewrite that output", "Stop here and summarize"]
      : ["Try a different approach", "Skip ahead", "Summarize what we know"];
  room.updatedAt = now();
  rooms.set(roomId, room);
  enqueueJob(roomId);

  emitted.push(
    appendEvent(
      roomId,
      "gate.resolved",
      { decision, gateId, choice: cleanChoice || undefined },
      { id: member.id, name: member.name },
    ),
  );
  emitted.push(
    appendEvent(roomId, "ask.human", {
      question: "Decision recorded. What should the agent do next?",
      hints: room.promptHints,
    }),
  );

  return { room: getRoom(roomId)!, event: emitted[emitted.length - 1], events: emitted };
}

export function pauseRoom(roomId: string) {
  const room = rooms.get(roomId);
  if (!room) return null;
  room.status = "paused";
  rooms.set(roomId, room);
  return appendEvent(roomId, "paused", {});
}

export function killRoom(roomId: string) {
  const room = rooms.get(roomId);
  if (!room) return null;
  checkpoints.set(roomId, { stepIndex: room.currentStepIndex, plan: structuredClone(room.plan) });
  room.status = "paused";
  rooms.set(roomId, room);
  const cp = appendEvent(roomId, "checkpoint", {
    stepIndex: room.currentStepIndex,
  });
  const killed = appendEvent(roomId, "killed", {});
  return { room: getRoom(roomId)!, events: [cp, killed] };
}

export function resumeRoom(roomId: string) {
  const room = rooms.get(roomId);
  if (!room) return null;
  const cp = checkpoints.get(roomId);
  if (cp) {
    room.currentStepIndex = cp.stepIndex;
    room.plan = cp.plan;
  }
  room.status = "awaiting_human";
  room.promptHints = ["Continue one step", "Change direction", "Summarize and finish"];
  rooms.set(roomId, room);
  const ask = appendEvent(roomId, "ask.human", {
    question: "Resumed — agent is waiting. What should it do?",
    hints: room.promptHints,
  });
  const resumed = appendEvent(roomId, "resumed", { stepIndex: room.currentStepIndex });
  return { room: getRoom(roomId)!, events: [ask, resumed] };
}

export function applyWorkerEvent(
  roomId: string,
  body: {
    type: EventType;
    payload?: Record<string, unknown>;
    plan?: PlanStep[];
    currentStepIndex?: number;
    status?: RoomStatus;
    gate?: GateState | null;
    summary?: string;
  },
) {
  const room = rooms.get(roomId);
  if (!room) return null;
  if (body.plan) room.plan = body.plan;
  if (typeof body.currentStepIndex === "number") room.currentStepIndex = body.currentStepIndex;
  if (body.status) room.status = body.status;
  if (body.gate !== undefined) room.gate = body.gate;
  if (body.summary) room.summary = body.summary;
  if (body.type === "ask.human") {
    room.status = "awaiting_human";
    if (Array.isArray(body.payload?.hints)) {
      room.promptHints = (body.payload.hints as unknown[])
        .map((h) => stripUiText(h))
        .filter(Boolean)
        .slice(0, 4);
      if (body.payload) body.payload.hints = room.promptHints;
    }
    if (body.payload?.question) {
      body.payload.question = stripUiText(body.payload.question);
    }
  }
  if (body.gate && Array.isArray(body.gate.options)) {
    room.gate = {
      ...body.gate,
      options: body.gate.options.map((o) => stripUiText(o)).filter(Boolean),
    };
  }
  room.updatedAt = now();
  rooms.set(roomId, room);
  const event = appendEvent(roomId, body.type, body.payload ?? {}, { name: "Agent" });
  return { room, event };
}

export function seedDemoRoom() {
  const { room } = createRoom({
    title: `pair-debug-${Date.now().toString(36).slice(-4)}`,
    templateId: "checkout-500",
    ownerName: "You",
  });
  startRoom(room.id);
  return getRoom(room.id)!;
}

export function ackSteers(roomId: string) {
  const list = events.get(roomId) ?? [];
  for (const e of list) {
    if (e.type === "steer") e.payload.agentAcked = true;
  }
  events.set(roomId, list);
  return list;
}

export function presenceUpdate(roomId: string, memberId: string, mode: PresenceMode) {
  const room = rooms.get(roomId);
  if (!room) return null;
  const member = room.members.find((m) => m.id === memberId);
  if (!member) return null;
  member.mode = mode;
  rooms.set(roomId, room);
  return appendEvent(roomId, "presence.update", { memberId, mode }, { id: member.id, name: member.name });
}

/** Mock + real Slack resolve beat — always emits a canvas-visible tool event. */
export function emitResolveIntegrations(roomId: string, summary: string, slackPosted: boolean) {
  const room = rooms.get(roomId);
  if (!room) return null;
  const event = appendEvent(
    roomId,
    "step.tool",
    {
      tool: "slack.post",
      detail: slackPosted ? "Posted to Slack thread" : "Mock · #eng-incidents",
      result: [
        slackPosted ? "✅ Posted resolve summary to Slack thread" : "✅ Posted resolve summary to Slack · #eng-incidents (mock)",
        "",
        summary,
        "",
        "Zapier · gate-approved zap idle (no open gate).",
      ].join("\n"),
    },
    { name: "Slack" },
  );
  return { room: getRoom(roomId)!, event };
}
