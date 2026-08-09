import { useCallback, useEffect, useMemo, useRef, type PointerEvent as ReactPointerEvent } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  useStore,
  type Connection,
  type Edge,
  type Node,
  type NodeTypes,
  type OnNodeDrag,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Plus, StickyNote } from "lucide-react";
import {
  BrainstormNoteNode,
  ContextNoteNode,
  GateNode,
  PlanStepNode,
  SteerNode,
  ToolNode,
} from "./nodes/CanvasNodes";
import { buildCanvasGraph, type CanvasNodeData } from "../../lib/canvasGraph";
import type { CanvasAction, GateState, Room, RoomEvent, RoomMember } from "../../lib/types";

export type CursorPeer = {
  memberId: string;
  name: string;
  color: string;
  x: number;
  y: number;
};

type Props = {
  room: Room;
  events: RoomEvent[];
  member: RoomMember;
  canSteer: boolean;
  readOnly?: boolean;
  cursors?: CursorPeer[];
  onCursorMove?: (pos: { x: number; y: number }) => void;
  onCanvas: (action: CanvasAction) => Promise<void>;
  onGate: (decision: "approved" | "rejected", choice?: string) => void;
};

type FlowNode = Node<CanvasNodeData>;

function CursorOverlay({ cursors }: { cursors: CursorPeer[] }) {
  const { flowToScreenPosition } = useReactFlow();
  const viewport = useStore((s) => s.transform);

  return (
    <>
      {cursors.map((c) => {
        const screen = flowToScreenPosition({ x: c.x, y: c.y });
        return (
          <div
            key={`${c.memberId}-${viewport[0]}-${viewport[1]}-${viewport[2]}`}
            className="pointer-events-none absolute z-20"
            style={{ left: screen.x, top: screen.y, transform: "translate(-2px, -2px)" }}
          >
            <svg width="16" height="20" viewBox="0 0 16 20" fill={c.color}>
              <path d="M0 0 L16 12 L9 13 L12 20 L8 21 L5 14 L0 18 Z" />
            </svg>
            <span
              className="ml-3 -mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium text-white"
              style={{ background: c.color }}
            >
              {c.name}
            </span>
          </div>
        );
      })}
    </>
  );
}

function RoomCanvasInner({
  room,
  events,
  member,
  canSteer,
  readOnly,
  cursors = [],
  onCursorMove,
  onCanvas,
  onGate,
}: Props) {
  const editable = canSteer && !readOnly;
  const graph = useMemo(
    () => buildCanvasGraph(room, events, { canEdit: editable }),
    [room, events, editable],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>(graph.nodes as FlowNode[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState(graph.edges);
  const syncing = useRef(false);
  const dragging = useRef(false);
  const posOverrides = useRef<Map<string, { x: number; y: number }>>(new Map());
  const updateTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const gateRef = useRef(onGate);
  const canSteerRef = useRef(editable);
  const lastCursorSent = useRef(0);
  const didFit = useRef(false);
  gateRef.current = onGate;
  canSteerRef.current = editable;

  const mergePositions = useCallback((incoming: FlowNode[]) => {
    return incoming.map((n) => {
      const override = posOverrides.current.get(n.id);
      return {
        ...n,
        draggable: editable,
        position: override ?? n.position,
      };
    });
  }, [editable]);

  useEffect(() => {
    if (dragging.current) return;
    syncing.current = true;
    setNodes(mergePositions(graph.nodes as FlowNode[]));
    setEdges(graph.edges);
    const t = setTimeout(() => {
      syncing.current = false;
    }, 0);
    return () => clearTimeout(t);
  }, [graph, setNodes, setEdges, mergePositions]);

  const onConnect = useCallback(
    async (connection: Connection) => {
      if (!editable || !connection.source || !connection.target) return;
      setEdges((eds) => addEdge({ ...connection, type: "smoothstep" }, eds));
      await onCanvas({
        action: "connect",
        source: connection.source,
        target: connection.target,
      });
    },
    [editable, onCanvas, setEdges],
  );

  const handleEdgesChange = useCallback(
    (changes: Parameters<typeof onEdgesChange>[0]) => {
      onEdgesChange(changes);
      if (!editable) return;
      for (const change of changes) {
        if (
          change.type === "remove" &&
          change.id &&
          !change.id.startsWith("plan-") &&
          !change.id.startsWith("tool-") &&
          !change.id.startsWith("gate-") &&
          !change.id.startsWith("steer-")
        ) {
          void onCanvas({ action: "disconnect", edgeId: change.id });
        }
      }
    },
    [editable, onCanvas, onEdgesChange],
  );

  const onNodeDragStart: OnNodeDrag<FlowNode> = useCallback(() => {
    dragging.current = true;
  }, []);

  const onNodeDrag: OnNodeDrag<FlowNode> = useCallback((_evt, node) => {
    posOverrides.current.set(node.id, { x: node.position.x, y: node.position.y });
  }, []);

  const onNodeDragStop: OnNodeDrag<FlowNode> = useCallback(
    async (_evt, node) => {
      dragging.current = false;
      posOverrides.current.set(node.id, { x: node.position.x, y: node.position.y });
      if (!editable || syncing.current) return;
      if (node.type !== "contextNote" && node.type !== "brainstormNote") return;
      await onCanvas({
        action: "move",
        noteId: node.id,
        x: node.position.x,
        y: node.position.y,
      });
    },
    [editable, onCanvas],
  );

  const scheduleUpdate = useCallback(
    (noteId: string, patch: { title?: string; body?: string }) => {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== noteId || n.data.kind !== "note") return n;
          return {
            ...n,
            data: {
              ...n.data,
              title: patch.title ?? n.data.title,
              body: patch.body ?? n.data.body,
            },
          };
        }),
      );
      const prev = updateTimers.current.get(noteId);
      if (prev) clearTimeout(prev);
      updateTimers.current.set(
        noteId,
        setTimeout(() => {
          void onCanvas({ action: "update", noteId, ...patch });
        }, 350),
      );
    },
    [onCanvas, setNodes],
  );

  const nodeTypes: NodeTypes = useMemo(
    () => ({
      planStep: PlanStepNode,
      toolNode: ToolNode,
      steerNode: SteerNode,
      gateNode: (props) => (
        <GateNode
          {...props}
          data={props.data as { kind: "gate"; gate: GateState }}
          canSteer={canSteerRef.current}
          onDecide={(decision, choice) => gateRef.current(decision, choice)}
        />
      ),
      contextNote: (props) => (
        <ContextNoteNode
          {...props}
          data={props.data as CanvasNodeData & { kind: "note" }}
          onChange={scheduleUpdate}
          onDelete={(noteId) => void onCanvas({ action: "delete", noteId })}
        />
      ),
      brainstormNote: (props) => (
        <BrainstormNoteNode
          {...props}
          data={props.data as CanvasNodeData & { kind: "note" }}
          onChange={scheduleUpdate}
          onDelete={(noteId) => void onCanvas({ action: "delete", noteId })}
        />
      ),
    }),
    [onCanvas, scheduleUpdate],
  );

  const { screenToFlowPosition } = useReactFlow();

  const onPointerMove = useCallback(
    (e: ReactPointerEvent) => {
      if (!onCursorMove) return;
      const now = Date.now();
      if (now - lastCursorSent.current < 50) return;
      lastCursorSent.current = now;
      const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      onCursorMove(pos);
    },
    [onCursorMove, screenToFlowPosition],
  );

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {!readOnly && (
        <div className="flex items-center gap-2 border-b border-[var(--color-line)] px-3 py-2">
          <button
            type="button"
            disabled={!editable}
            onClick={() =>
              void onCanvas({
                action: "add",
                kind: "brainstorm",
                title: "Hypothesis",
                body: "",
                x: 240,
                y: 160 + (room.canvas?.notes.length ?? 0) * 20,
              })
            }
            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-line)] px-2.5 py-1.5 text-xs hover:border-[var(--color-accent)] disabled:opacity-40"
          >
            <StickyNote size={12} /> Add note
          </button>
          <button
            type="button"
            disabled={!editable}
            onClick={() =>
              void onCanvas({
                action: "add",
                kind: "context",
                title: "Context",
                body: "Company / product note…",
                x: 60,
                y: 200 + (room.canvas?.notes.length ?? 0) * 20,
              })
            }
            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-line)] px-2.5 py-1.5 text-xs hover:border-[var(--color-accent)] disabled:opacity-40"
          >
            <Plus size={12} /> Add context
          </button>
          <span className="ml-auto text-[11px] text-[var(--color-muted)]">
            Drag cards · scroll to pan · middle-click pans
          </span>
        </div>
      )}

      <div className="relative min-h-0 flex-1" onPointerMove={onPointerMove}>
        <ReactFlow
          nodes={nodes}
          edges={edges as Edge[]}
          onNodesChange={editable ? onNodesChange : undefined}
          onEdgesChange={editable ? handleEdgesChange : undefined}
          onConnect={editable ? onConnect : undefined}
          onNodeDragStart={editable ? onNodeDragStart : undefined}
          onNodeDrag={editable ? onNodeDrag : undefined}
          onNodeDragStop={editable ? onNodeDragStop : undefined}
          nodeTypes={nodeTypes}
          nodesDraggable={editable}
          nodesConnectable={editable}
          elementsSelectable={!readOnly}
          selectNodesOnDrag={false}
          panOnDrag={[1, 2]}
          panOnScroll
          zoomOnScroll
          zoomOnPinch
          selectionOnDrag={false}
          connectOnClick={false}
          onInit={(instance) => {
            if (!didFit.current) {
              void instance.fitView({ padding: 0.2 });
              didFit.current = true;
            }
          }}
          minZoom={0.35}
          maxZoom={1.6}
          proOptions={{ hideAttribution: true }}
          className="room-canvas-flow"
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={22}
            size={1}
            color="rgba(232,234,239,0.09)"
            bgColor="#0f1115"
          />
          <Controls className="!bg-[var(--color-panel)] !border-[var(--color-line)] !shadow-none" />
          <MiniMap
            className="!bg-[var(--color-panel)] !border-[var(--color-line)]"
            maskColor="rgba(15,17,21,0.7)"
            nodeColor={(n) => {
              if (n.type === "gateNode") return "#f2c94c";
              if (n.type === "brainstormNote" || n.type === "steerNode") return "#5e6ad2";
              if (n.type === "contextNote") return "#8b93a7";
              return "#4cb782";
            }}
          />
          <CursorOverlay cursors={cursors.filter((c) => c.memberId !== member.id)} />
        </ReactFlow>
      </div>
    </div>
  );
}

export function RoomCanvas(props: Props) {
  return (
    <ReactFlowProvider>
      <RoomCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
