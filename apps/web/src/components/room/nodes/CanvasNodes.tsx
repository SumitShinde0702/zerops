import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "../../../lib/utils";
import type {
  NoteNodeData,
  PlanStepNodeData,
  ToolNodeData,
  GateNodeData,
  SteerNodeData,
} from "../../../lib/canvasGraph";
import type { IntegrationId } from "../../../lib/types";

const INTEGRATION_LABEL: Record<IntegrationId, string> = {
  slack: "Slack",
  drive: "Drive",
  zapier: "Zapier",
  pagerduty: "PagerDuty",
  github: "GitHub",
};

export function PlanStepNode({ data }: NodeProps & { data: PlanStepNodeData }) {
  const { step, index } = data;
  return (
    <div
      className={cn(
        "min-w-[200px] max-w-[240px] rounded-lg border bg-[var(--color-panel)] px-3 py-2.5 shadow-[0_12px_40px_rgba(0,0,0,0.35)]",
        step.status === "active" && "border-[var(--color-accent)] ring-1 ring-[var(--color-accent)]/40",
        step.status === "done" && "border-[var(--color-good)]/50",
        (step.status === "cancelled" || step.status === "skipped") &&
          "border-[var(--color-line)] opacity-50",
        step.status === "pending" && "border-[var(--color-line)]",
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-[var(--color-muted)] !w-2 !h-2" />
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "h-1.5 w-1.5 shrink-0 rounded-full",
            step.status === "active" && "bg-[var(--color-good)] animate-pulse",
            step.status === "done" && "bg-[var(--color-good)]",
            step.status === "pending" && "bg-[var(--color-muted)]",
            (step.status === "cancelled" || step.status === "skipped") && "bg-[var(--color-bad)]",
          )}
        />
        <span className="text-[10px] uppercase tracking-wide text-[var(--color-muted)]">
          Step {index + 1}
        </span>
      </div>
      <p
        className={cn(
          "mt-1 text-sm font-medium text-[var(--color-text)]",
          (step.status === "cancelled" || step.status === "skipped") && "line-through",
        )}
      >
        {step.title}
      </p>
      <Handle type="source" position={Position.Bottom} className="!bg-[var(--color-muted)] !w-2 !h-2" />
      <Handle type="target" position={Position.Left} id="left" className="!bg-[var(--color-accent-2)] !w-2 !h-2" />
    </div>
  );
}

export function ToolNode({ data }: NodeProps & { data: ToolNodeData }) {
  return (
    <div className="min-w-[180px] max-w-[220px] rounded-lg border border-[var(--color-line)] bg-[var(--color-ink)] px-3 py-2 shadow-[0_10px_30px_rgba(0,0,0,0.3)]">
      <Handle type="target" position={Position.Left} className="!bg-[var(--color-good)] !w-2 !h-2" />
      <div className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-accent-2)]">
        {data.tool}
      </div>
      {data.detail ? <p className="mt-0.5 text-[11px] text-[var(--color-muted)]">{data.detail}</p> : null}
      <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-xs text-[var(--color-text)]">{data.result}</p>
    </div>
  );
}

export function GateNode({
  data,
  onDecide,
  canSteer,
}: NodeProps & {
  data: GateNodeData;
  onDecide?: (decision: "approved" | "rejected", choice?: string) => void;
  canSteer?: boolean;
}) {
  const { gate } = data;
  return (
    <div className="min-w-[220px] max-w-[260px] rounded-lg border border-[var(--color-warn)] bg-[color-mix(in_srgb,var(--color-warn)_12%,var(--color-panel))] px-3 py-2.5 shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
      <Handle type="target" position={Position.Left} className="!bg-[var(--color-warn)] !w-2 !h-2" />
      <div className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-warn)]">Gate</div>
      <p className="mt-1 text-sm font-medium">{gate.title}</p>
      <p className="mt-1 line-clamp-3 text-xs text-[var(--color-muted)]">{gate.description}</p>
      {gate.options && gate.options.length > 0 ? (
        <div className="mt-2 flex flex-col gap-1.5">
          {gate.options.map((opt) => (
            <button
              key={opt}
              type="button"
              disabled={!canSteer}
              onClick={() => onDecide?.("approved", opt)}
              className="nodrag rounded-md border border-[var(--color-line)] bg-[var(--color-panel)] px-2 py-1.5 text-left text-[11px] hover:border-[var(--color-accent)] disabled:opacity-40"
            >
              {opt}
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            disabled={!canSteer}
            onClick={() => onDecide?.("approved")}
            className="rounded-md border border-[var(--color-good)] px-2 py-1 text-[11px] text-[var(--color-good)] disabled:opacity-40"
          >
            Approve
          </button>
          <button
            type="button"
            disabled={!canSteer}
            onClick={() => onDecide?.("rejected")}
            className="rounded-md border border-[var(--color-bad)] px-2 py-1 text-[11px] text-[var(--color-bad)] disabled:opacity-40"
          >
            Reject
          </button>
        </div>
      )}
    </div>
  );
}

export function SteerNode({ data }: NodeProps & { data: SteerNodeData }) {
  return (
    <div className="min-w-[160px] max-w-[200px] rounded-lg border border-[var(--color-accent)]/50 bg-[color-mix(in_srgb,var(--color-accent)_18%,var(--color-panel))] px-3 py-2 shadow-[0_10px_30px_rgba(0,0,0,0.3)]">
      <Handle type="source" position={Position.Right} className="!bg-[var(--color-accent)] !w-2 !h-2" />
      <div className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-accent-2)]">
        Steer · {data.actorName}
      </div>
      <p className="mt-1 text-xs text-[var(--color-text)]">{data.message}</p>
    </div>
  );
}

export function ContextNoteNode({
  data,
  onChange,
  onDelete,
}: NodeProps & {
  data: NoteNodeData;
  onChange?: (noteId: string, patch: { title?: string; body?: string }) => void;
  onDelete?: (noteId: string) => void;
}) {
  const integration = data.integration;
  return (
    <div
      className={cn(
        "min-w-[200px] max-w-[260px] rounded-lg border bg-[color-mix(in_srgb,var(--color-panel)_95%,transparent)] px-3 py-2.5 shadow-[0_12px_40px_rgba(0,0,0,0.35)]",
        integration ? "border-[var(--color-accent)]/35" : "border-[var(--color-line)]",
      )}
    >
      <Handle type="source" position={Position.Right} className="!bg-[var(--color-accent-2)] !w-2 !h-2" />
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
          {integration ? INTEGRATION_LABEL[integration] : "Context"}
        </span>
        {data.editable && onDelete && !integration ? (
          <button
            type="button"
            className="text-[10px] text-[var(--color-muted)] hover:text-[var(--color-bad)]"
            onClick={() => onDelete(data.noteId)}
          >
            Remove
          </button>
        ) : null}
      </div>
      {data.editable && !integration ? (
        <>
          <input
            className="nodrag mt-1 w-full bg-transparent text-sm font-medium outline-none"
            value={data.title}
            onChange={(e) => onChange?.(data.noteId, { title: e.target.value })}
          />
          <textarea
            className="nodrag nowheel mt-1 max-h-40 w-full resize-none bg-transparent text-xs leading-relaxed text-[var(--color-muted)] outline-none"
            rows={5}
            value={data.body}
            onChange={(e) => onChange?.(data.noteId, { body: e.target.value })}
          />
        </>
      ) : (
        <>
          <p className="mt-1 text-sm font-medium">{data.title}</p>
          <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap font-sans text-xs text-[var(--color-muted)]">
            {data.body}
          </pre>
        </>
      )}
      <Handle type="target" position={Position.Left} className="!bg-[var(--color-muted)] !w-2 !h-2" />
    </div>
  );
}

export function BrainstormNoteNode({
  data,
  onChange,
  onDelete,
}: NodeProps & {
  data: NoteNodeData;
  onChange?: (noteId: string, patch: { title?: string; body?: string }) => void;
  onDelete?: (noteId: string) => void;
}) {
  return (
    <div className="min-w-[180px] max-w-[220px] rounded-lg border border-[var(--color-accent)]/40 bg-[color-mix(in_srgb,var(--color-accent)_12%,var(--color-panel))] px-3 py-2.5 shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
      <Handle type="target" position={Position.Left} className="!bg-[var(--color-accent-2)] !w-2 !h-2" />
      <Handle type="source" position={Position.Right} className="!bg-[var(--color-accent-2)] !w-2 !h-2" />
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-accent-2)]">
          Note
        </span>
        {data.editable && onDelete ? (
          <button
            type="button"
            className="text-[10px] text-[var(--color-muted)] hover:text-[var(--color-bad)]"
            onClick={() => onDelete(data.noteId)}
          >
            Remove
          </button>
        ) : null}
      </div>
      {data.editable ? (
        <>
          <input
            className="nodrag mt-1 w-full bg-transparent text-sm font-medium outline-none"
            value={data.title}
            onChange={(e) => onChange?.(data.noteId, { title: e.target.value })}
            placeholder="Hypothesis"
          />
          <textarea
            className="nodrag nowheel mt-1 w-full resize-none bg-transparent text-xs text-[var(--color-muted)] outline-none"
            rows={3}
            value={data.body}
            onChange={(e) => onChange?.(data.noteId, { body: e.target.value })}
            placeholder="What are we exploring?"
          />
        </>
      ) : (
        <>
          <p className="mt-1 text-sm font-medium">{data.title}</p>
          <p className="mt-1 text-xs text-[var(--color-muted)]">{data.body}</p>
        </>
      )}
    </div>
  );
}
