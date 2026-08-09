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
  | "ask.human"
  | "canvas.updated";

export type CanvasNoteKind = "context" | "brainstorm";

export type IntegrationId = "slack" | "drive" | "zapier" | "pagerduty" | "github";

export interface CanvasNote {
  id: string;
  kind: CanvasNoteKind;
  title: string;
  body: string;
  x: number;
  y: number;
  authorId?: string;
  integration?: IntegrationId;
}

export interface CanvasEdge {
  id: string;
  source: string;
  target: string;
}

export interface RoomCanvas {
  notes: CanvasNote[];
  edges: CanvasEdge[];
}

export type CanvasAction =
  | { action: "add"; kind?: CanvasNoteKind; title?: string; body?: string; x?: number; y?: number }
  | { action: "update"; noteId: string; title?: string; body?: string }
  | { action: "move"; noteId: string; x: number; y: number }
  | { action: "connect"; source: string; target: string }
  | { action: "disconnect"; edgeId: string }
  | { action: "delete"; noteId: string }
  | { action: "pin-to-run"; noteId: string; stepId: string };

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
  canvas: RoomCanvas;
}

export function emptyCanvas(): RoomCanvas {
  return { notes: [], edges: [] };
}

export interface Template {
  id: string;
  name: string;
  description: string;
  steps: string[];
}

export const TEMPLATES: Template[] = [
  {
    id: "checkout-500",
    name: "Pair-debug production bug",
    description: "Agent investigates with you — stops for decisions, not a solo autopilot.",
    steps: [
      "Pull live error signal",
      "Lay out competing hypotheses",
      "Investigate the chosen path",
      "Draft a concrete fix",
      "Open pull request",
    ],
  },
  {
    id: "failing-test",
    name: "Unstick a red CI test",
    description: "Reproduce, pick a theory with the room, then patch.",
    steps: [
      "Reproduce the failure",
      "Propose why it broke",
      "Prove or kill the top theory",
      "Ship a patch",
      "Open pull request",
    ],
  },
  {
    id: "incident-reply",
    name: "Co-write an incident update",
    description: "Gather facts, then humans pick tone/audience before anything sends.",
    steps: [
      "Build the fact timeline",
      "Estimate customer impact",
      "Draft two tone options",
      "Prepare FAQ",
      "Send customer update",
    ],
  },
];

export const MEMBER_COLORS = ["#5E6AD2", "#26B5CE", "#4CB782", "#F2C94C", "#EB5757", "#BB87FC"];

export function createPlan(steps: string[]): PlanStep[] {
  return steps.map((title, i) => ({
    id: `s${i + 1}`,
    title,
    status: i === 0 ? "active" : "pending",
  }));
}
