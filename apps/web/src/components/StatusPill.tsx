import { cn } from "../lib/utils";
import type { RoomStatus } from "../lib/types";

const styles: Record<string, string> = {
  running: "bg-[color-mix(in_srgb,var(--color-good)_20%,transparent)] text-[var(--color-good)]",
  awaiting_human: "bg-[color-mix(in_srgb,var(--color-accent)_25%,transparent)] text-[var(--color-accent-2)]",
  needs_you: "bg-[color-mix(in_srgb,var(--color-warn)_20%,transparent)] text-[var(--color-warn)]",
  paused: "bg-[color-mix(in_srgb,var(--color-bad)_25%,transparent)] text-[var(--color-bad)] ring-1 ring-[var(--color-bad)]",
  done: "bg-[color-mix(in_srgb,var(--color-accent)_20%,transparent)] text-[var(--color-accent-2)]",
  pending: "bg-[var(--color-panel-2)] text-[var(--color-muted)]",
  failed: "bg-[color-mix(in_srgb,var(--color-bad)_20%,transparent)] text-[var(--color-bad)]",
};

const labels: Record<string, string> = {
  awaiting_human: "waiting on you",
  needs_you: "needs decision",
  paused: "paused",
};

export function StatusPill({ status }: { status: RoomStatus | string }) {
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide", styles[status] || styles.pending)}>
      {labels[status] || status.replace("_", " ")}
    </span>
  );
}
