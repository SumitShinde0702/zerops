import {
  MEMBER_COLORS,
  TEMPLATES,
  createPlan,
  type EventType,
  type GateState,
  type MemberRole,
  type PlanStep,
  type PresenceMode,
  type Room,
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
  };
  rooms.set(id, room);
  events.set(id, []);
  const event = appendEvent(id, "room.updated", { status: room.status }, { id: ownerId, name: room.ownerName });
  return { room, event };
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

export function steerRoom(roomId: string, memberId: string, message: string) {
  const room = rooms.get(roomId);
  if (!room) return null;
  const member = room.members.find((m) => m.id === memberId);
  if (!member || member.role === "viewer") return { error: "forbidden" as const };

  room.steersCount += 1;
  const note = `${member.name}: ${message}`;

  room.updatedAt = now();
  rooms.set(roomId, room);
  const event = appendEvent(
    roomId,
    "steer",
    { message, note, agentAcked: false },
    { id: member.id, name: member.name },
  );
  // Wake worker so LLM can react even mid-run / after pause
  if (room.status === "running" || room.status === "paused" || room.status === "needs_you") {
    enqueueJob(roomId);
    if (room.status === "paused") {
      room.status = "running";
      rooms.set(roomId, room);
    }
  }
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
  room.updatedAt = now();
  rooms.set(roomId, room);
  const event = appendEvent(
    roomId,
    "handoff",
    { fromId, toId, ownerName: to.name },
    { id: from.id, name: from.name },
  );
  return { room, event };
}

export function takeOver(roomId: string, memberId: string) {
  const room = rooms.get(roomId);
  if (!room) return null;
  return handoff(roomId, room.ownerId, memberId);
}

export function resolveGate(roomId: string, memberId: string, decision: "approved" | "rejected") {
  const room = rooms.get(roomId);
  if (!room || !room.gate || room.gate.status !== "open") return null;
  const member = room.members.find((m) => m.id === memberId);
  if (!member || member.role === "viewer") return { error: "forbidden" as const };

  const gateId = room.gate.id;
  room.gate.status = decision;
  const step = room.plan[room.currentStepIndex];
  if (step) {
    step.status = decision === "approved" ? "done" : "cancelled";
  }
  room.currentStepIndex += 1;
  room.gate = null;
  room.status = "running";
  room.updatedAt = now();
  rooms.set(roomId, room);
  enqueueJob(roomId);
  const event = appendEvent(
    roomId,
    "gate.resolved",
    { decision, gateId },
    { id: member.id, name: member.name },
  );
  return { room, event };
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
  appendEvent(roomId, "killed", {});
  return { room, event: cp };
}

export function resumeRoom(roomId: string) {
  const room = rooms.get(roomId);
  if (!room) return null;
  const cp = checkpoints.get(roomId);
  if (cp) {
    room.currentStepIndex = cp.stepIndex;
    room.plan = cp.plan;
  }
  room.status = "running";
  rooms.set(roomId, room);
  enqueueJob(roomId);
  return appendEvent(roomId, "resumed", { stepIndex: room.currentStepIndex });
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
  room.updatedAt = now();
  rooms.set(roomId, room);
  const event = appendEvent(roomId, body.type, body.payload ?? {}, { name: "Agent" });
  return { room, event };
}

export function seedDemoRoom() {
  const existing = [...rooms.values()].find((r) => r.title.includes("checkout-500"));
  if (existing) return existing;
  const { room } = createRoom({
    title: "checkout-500",
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
