export type RoomStatus =
  | "pending"
  | "running"
  | "awaiting_human"
  | "paused"
  | "needs_you"
  | "done"
  | "failed";
export type MemberRole = "owner" | "editor" | "viewer";
export type PresenceMode = "watching" | "steering";

export type EventType =
  | "step.started"
  | "step.tool"
  | "step.finished"
  | "presence.join"
  | "presence.leave"
  | "presence.update"
  | "steer"
  | "handoff"
  | "gate.requested"
  | "gate.resolved"
  | "checkpoint"
  | "resumed"
  | "paused"
  | "killed"
  | "room.updated"
  | "plan.updated"
  | "ask.human";

export interface PlanStep {
  id: string;
  title: string;
  status: "pending" | "active" | "done" | "cancelled" | "skipped";
}

export interface RoomMember {
  id: string;
  name: string;
  role: MemberRole;
  mode: PresenceMode;
  color: string;
  joinedAt: string;
}

export interface RoomEvent {
  id: string;
  roomId: string;
  type: EventType;
  at: string;
  actorId?: string;
  actorName?: string;
  payload: Record<string, unknown>;
}

export interface GateState {
  id: string;
  title: string;
  description: string;
  status: "open" | "approved" | "rejected";
  options?: string[];
}

export interface Room {
  id: string;
  title: string;
  templateId: string;
  status: RoomStatus;
  ownerId: string;
  ownerName: string;
  plan: PlanStep[];
  currentStepIndex: number;
  gate: GateState | null;
  members: RoomMember[];
  steersCount: number;
  handoffsCount: number;
  createdAt: string;
  updatedAt: string;
  summary?: string;
  promptHints?: string[];
  liveViewers?: number;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  steps: string[];
}
