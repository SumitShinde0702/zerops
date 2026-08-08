export type RoomStatus = "pending" | "running" | "paused" | "needs_you" | "done" | "failed";
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
  | "plan.updated";

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
    name: "Debug production bug",
    description: "Investigate checkout 500, draft a fix, gate before opening a PR.",
    steps: [
      "Read error logs",
      "Locate failing handler",
      "Query orders table",
      "Draft fix",
      "Run test suite",
      "Open pull request",
      "Write handoff summary",
    ],
  },
  {
    id: "failing-test",
    name: "Review failing test",
    description: "Reproduce a red CI test, isolate flake vs real failure, propose patch.",
    steps: [
      "Pull failing CI logs",
      "Reproduce locally",
      "Isolate root cause",
      "Draft test fix",
      "Re-run suite",
      "Open pull request",
      "Summarize for reviewer",
    ],
  },
  {
    id: "incident-reply",
    name: "Draft incident reply",
    description: "Gather timeline, draft customer-facing update, gate before send.",
    steps: [
      "Collect incident timeline",
      "Identify customer impact",
      "Draft status update",
      "Review tone & accuracy",
      "Prepare FAQ",
      "Send customer update",
      "Log postmortem notes",
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
