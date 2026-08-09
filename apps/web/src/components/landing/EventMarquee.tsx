import { motion, useReducedMotion } from "motion/react";

const EVENTS = [
  "step.started",
  "step.completed",
  "presence.join",
  "steer",
  "handoff",
  "gate.pending",
  "gate.approved",
  "checkpoint",
  "resumed",
];

export function EventMarquee() {
  const reduce = useReducedMotion();
  const loop = [...EVENTS, ...EVENTS];

  return (
    <section className="relative overflow-hidden border-y border-[var(--color-line)] bg-[var(--color-panel)]/40 py-8">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[var(--color-ink)] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[var(--color-ink)] to-transparent" />

      <motion.div
        className="flex w-max gap-10 whitespace-nowrap px-6 font-[family-name:var(--font-mono)] text-sm text-[var(--color-muted)]"
        animate={reduce ? undefined : { x: ["0%", "-50%"] }}
        transition={
          reduce
            ? undefined
            : { duration: 28, ease: "linear", repeat: Infinity }
        }
      >
        {loop.map((event, i) => (
          <span key={`${event}-${i}`} className="inline-flex items-center gap-10">
            <span>{event}</span>
            <span className="text-[var(--color-line)]" aria-hidden>
              /
            </span>
          </span>
        ))}
      </motion.div>
    </section>
  );
}
