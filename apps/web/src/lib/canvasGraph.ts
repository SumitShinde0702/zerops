import type { Edge, Node } from "@xyflow/react";
import type { GateState, IntegrationId, PlanStep, Room, RoomCanvas, RoomEvent } from "./types";

export type PlanStepNodeData = {
  kind: "plan";
  step: PlanStep;
  index: number;
};

export type ToolNodeData = {
  kind: "tool";
  tool: string;
  detail: string;
  result: string;
};

export type GateNodeData = {
  kind: "gate";
  gate: GateState;
};

export type NoteNodeData = {
  kind: "note";
  noteId: string;
  noteKind: "context" | "brainstorm";
  title: string;
  body: string;
  editable: boolean;
  integration?: IntegrationId;
};

export type SteerNodeData = {
  kind: "steer";
  message: string;
  actorName: string;
};

export type CanvasNodeData =
  | PlanStepNodeData
  | ToolNodeData
  | GateNodeData
  | NoteNodeData
  | SteerNodeData;

const PLAN_X = 520;
const PLAN_Y0 = 40;
const PLAN_GAP = 140;
const TOOL_X = 860;
const TOOL_GAP = 150;
const GATE_X = 1140;
const STEER_X = 280;

function recentTools(events: RoomEvent[], limit = 4): RoomEvent[] {
  const tools = events.filter((e) => {
    if (e.type !== "step.tool") return false;
    const tool = String(e.payload.tool || "");
    return tool && tool !== "agent.steer" && tool !== "agent.reply" && tool !== "plan.redirect";
  });
  return tools.slice(-limit);
}

function recentSteers(events: RoomEvent[], limit = 5): RoomEvent[] {
  return events.filter((e) => e.type === "steer").slice(-limit);
}

export function buildCanvasGraph(
  room: Room,
  events: RoomEvent[],
  opts: { canEdit: boolean },
): { nodes: Node<CanvasNodeData>[]; edges: Edge[] } {
  const nodes: Node<CanvasNodeData>[] = [];
  const edges: Edge[] = [];
  const canvas = room.canvas ?? { notes: [], edges: [] };
  const canDrag = opts.canEdit;

  for (const note of canvas.notes) {
    nodes.push({
      id: note.id,
      type: note.kind === "context" ? "contextNote" : "brainstormNote",
      position: { x: note.x, y: note.y },
      data: {
        kind: "note",
        noteId: note.id,
        noteKind: note.kind,
        title: note.title,
        body: note.body,
        editable: opts.canEdit && !note.integration,
        integration: note.integration,
      },
      draggable: canDrag,
    });
  }

  for (const edge of canvas.edges) {
    edges.push({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: "smoothstep",
      animated: false,
      style: { stroke: "rgba(124,134,227,0.55)", strokeWidth: 1.5 },
    });
  }

  let prevPlanId: string | null = null;
  room.plan.forEach((step, index) => {
    const id = step.id;
    nodes.push({
      id,
      type: "planStep",
      position: { x: PLAN_X, y: PLAN_Y0 + index * PLAN_GAP },
      data: { kind: "plan", step, index },
      draggable: canDrag,
    });
    if (prevPlanId) {
      const skipped = step.status === "cancelled" || step.status === "skipped";
      const prevSkipped =
        room.plan[index - 1]?.status === "cancelled" || room.plan[index - 1]?.status === "skipped";
      edges.push({
        id: `plan-${prevPlanId}-${id}`,
        source: prevPlanId,
        target: id,
        type: "smoothstep",
        animated: step.status === "active",
        style: {
          stroke: skipped || prevSkipped ? "rgba(139,147,167,0.35)" : "rgba(232,234,239,0.35)",
          strokeWidth: 1.5,
          strokeDasharray: skipped || prevSkipped ? "6 4" : undefined,
        },
      });
    }
    prevPlanId = id;
  });

  const activeIndex = Math.max(
    0,
    room.plan.findIndex((s) => s.status === "active"),
  );
  const active = room.plan[activeIndex] ?? room.plan[room.currentStepIndex];
  const activeY = PLAN_Y0 + activeIndex * PLAN_GAP;
  const tools = recentTools(events);

  tools.forEach((ev, i) => {
    const tid = `tool-${ev.id}`;
    nodes.push({
      id: tid,
      type: "toolNode",
      position: { x: TOOL_X, y: activeY + i * TOOL_GAP },
      data: {
        kind: "tool",
        tool: String(ev.payload.tool || "tool"),
        detail: String(ev.payload.detail || ""),
        result: String(ev.payload.result || "").slice(0, 180),
      },
      draggable: canDrag,
    });
    if (active) {
      edges.push({
        id: `tool-edge-${ev.id}`,
        source: active.id,
        target: tid,
        type: "smoothstep",
        style: { stroke: "rgba(76,183,130,0.45)", strokeWidth: 1.25 },
      });
    }
  });

  if (room.gate?.status === "open") {
    const gid = `gate-${room.gate.id}`;
    nodes.push({
      id: gid,
      type: "gateNode",
      position: { x: GATE_X, y: activeY },
      data: { kind: "gate", gate: room.gate },
      draggable: canDrag,
    });
    if (active) {
      edges.push({
        id: `gate-edge-${room.gate.id}`,
        source: active.id,
        target: gid,
        type: "smoothstep",
        animated: true,
        style: { stroke: "rgba(242,201,76,0.7)", strokeWidth: 1.5 },
      });
    }
  }

  const steers = recentSteers(events);
  steers.forEach((ev, i) => {
    const sid = `steer-${ev.id}`;
    const message = String(ev.payload.message || ev.payload.note || "").slice(0, 140);
    if (!message) return;
    nodes.push({
      id: sid,
      type: "steerNode",
      position: { x: STEER_X, y: activeY + i * 90 },
      data: {
        kind: "steer",
        message,
        actorName: ev.actorName || "Someone",
      },
      draggable: canDrag,
    });
    if (active) {
      edges.push({
        id: `steer-edge-${ev.id}`,
        source: sid,
        target: active.id,
        targetHandle: "left",
        type: "smoothstep",
        style: { stroke: "rgba(94,106,210,0.55)", strokeWidth: 1.25 },
      });
    }
  });

  return { nodes, edges };
}

const REPLAY_TYPES = new Set([
  "steer",
  "canvas.updated",
  "step.tool",
  "step.started",
  "step.finished",
  "gate.requested",
  "gate.resolved",
  "presence.join",
  "ask.human",
  "plan.updated",
  "room.updated",
  "handoff",
  "checkpoint",
  "resumed",
  "killed",
  "paused",
]);

export function replayMilestones(events: RoomEvent[]): RoomEvent[] {
  return events.filter((e) => REPLAY_TYPES.has(e.type));
}

export function roomAtReplayIndex(
  base: Room,
  events: RoomEvent[],
  upToExclusive: number,
): { room: Room; events: RoomEvent[] } {
  const slice = events.slice(0, Math.max(0, upToExclusive));
  let canvas: RoomCanvas = { notes: [], edges: [] };
  for (const ev of slice) {
    if (ev.type === "canvas.updated" && ev.payload.canvas && typeof ev.payload.canvas === "object") {
      canvas = structuredClone(ev.payload.canvas as RoomCanvas);
    }
  }
  if (canvas.notes.length === 0 && base.canvas?.notes.length) {
    // Fallback for rooms seeded before snapshots
    canvas = structuredClone(base.canvas);
  }

  const plan: PlanStep[] = structuredClone(base.plan).map((s) => ({
    ...s,
    status: "pending" as PlanStep["status"],
  }));
  let currentStepIndex = 0;
  let gate: GateState | null = null;

  for (const ev of slice) {
    if (ev.type === "step.started") {
      const title = String(ev.payload.title || "");
      const idx = plan.findIndex((s) => s.title === title || s.id === ev.payload.stepId);
      if (idx >= 0) {
        plan.forEach((s, i) => {
          if (i < idx && s.status === "pending") s.status = "done";
          if (i === idx) s.status = "active";
        });
        currentStepIndex = idx;
      }
    }
    if (ev.type === "step.finished") {
      const title = String(ev.payload.title || "");
      const idx = plan.findIndex((s) => s.title === title);
      if (idx >= 0) {
        plan[idx].status = "done";
        if (plan[idx + 1]) {
          plan[idx + 1].status = "active";
          currentStepIndex = idx + 1;
        }
      }
    }
    if (ev.type === "plan.updated" && Array.isArray(ev.payload.plan)) {
      // rare
    }
    if (ev.type === "gate.requested" && ev.payload.gate) {
      gate = ev.payload.gate as GateState;
    }
    if (ev.type === "gate.resolved") {
      gate = null;
    }
  }

  if (!plan.some((s) => s.status === "active") && plan[currentStepIndex]) {
    plan[currentStepIndex].status = "active";
  }

  return {
    room: {
      ...base,
      canvas,
      plan,
      currentStepIndex,
      gate,
      status: slice.some((e) => e.type === "room.updated" && e.payload.status === "done")
        ? "done"
        : base.status,
    },
    events: slice,
  };
}
