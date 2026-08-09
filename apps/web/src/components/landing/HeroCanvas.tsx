import { motion, useReducedMotion } from "motion/react";

const NODES = [
  { x: 18, y: 28, label: "Maya", tone: "owner" as const },
  { x: 72, y: 22, label: "Alex", tone: "peer" as const },
  { x: 58, y: 58, label: "Jules", tone: "peer" as const },
  { x: 28, y: 68, label: "Sam", tone: "peer" as const },
];

const STEPS = [
  { x: 42, y: 36, title: "Reproduce checkout-500", state: "done" },
  { x: 48, y: 48, title: "Trace payment webhook", state: "live" },
  { x: 54, y: 62, title: "Open fix PR", state: "gated" },
];

export function HeroCanvas() {
  const reduce = useReducedMotion();

  return (
    <div
      className="landing-hero-canvas relative h-full min-h-[52vh] w-full overflow-hidden md:min-h-0"
      aria-hidden
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_60%_40%,rgba(94,106,210,0.22),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(76,183,130,0.08),transparent_40%)]" />

      <svg className="absolute inset-0 h-full w-full opacity-40" viewBox="0 0 100 100" preserveAspectRatio="none">
        <motion.path
          d="M28 68 C 36 52, 40 44, 42 36"
          fill="none"
          stroke="rgba(232,234,239,0.18)"
          strokeWidth="0.35"
          initial={reduce ? false : { pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.4, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        />
        <motion.path
          d="M18 28 C 30 30, 38 34, 42 36"
          fill="none"
          stroke="rgba(94,106,210,0.45)"
          strokeWidth="0.35"
          initial={reduce ? false : { pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.2, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
        />
        <motion.path
          d="M72 22 C 62 34, 54 42, 48 48"
          fill="none"
          stroke="rgba(232,234,239,0.16)"
          strokeWidth="0.35"
          initial={reduce ? false : { pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.3, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>

      {STEPS.map((step, i) => (
        <motion.div
          key={step.title}
          className="absolute -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[var(--color-line)] bg-[var(--color-panel)]/90 px-3 py-2 shadow-[0_18px_50px_rgba(0,0,0,0.35)] backdrop-blur-md"
          style={{ left: `${step.x}%`, top: `${step.y}%` }}
          initial={reduce ? false : { opacity: 0, scale: 0.92, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.45 + i * 0.12, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex items-center gap-2">
            <span
              className={
                step.state === "live"
                  ? "h-1.5 w-1.5 rounded-full bg-[var(--color-good)]"
                  : step.state === "gated"
                    ? "h-1.5 w-1.5 rounded-full bg-[var(--color-warn)]"
                    : "h-1.5 w-1.5 rounded-full bg-[var(--color-muted)]"
              }
            />
            <span className="whitespace-nowrap text-[11px] font-medium text-[var(--color-text)]">
              {step.title}
            </span>
          </div>
          {step.state === "live" && !reduce ? (
            <motion.div
              className="mt-2 h-[2px] origin-left rounded-full bg-[var(--color-accent)]"
              initial={{ scaleX: 0.15 }}
              animate={{ scaleX: [0.15, 0.85, 0.4, 0.95] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
            />
          ) : null}
        </motion.div>
      ))}

      {NODES.map((node, i) => (
        <motion.div
          key={node.label}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${node.x}%`, top: `${node.y}%` }}
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.85 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
        >
          <div
            className={
              node.tone === "owner"
                ? "flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-accent)] bg-[var(--color-accent)] text-[11px] font-semibold text-white shadow-[0_0_0_4px_rgba(94,106,210,0.18)]"
                : "flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-line)] bg-[var(--color-panel-2)] text-[11px] font-semibold text-[var(--color-text)]"
            }
          >
            {node.label.slice(0, 1)}
          </div>
          <p className="mt-1.5 text-center text-[10px] text-[var(--color-muted)]">{node.label}</p>
        </motion.div>
      ))}
    </div>
  );
}
