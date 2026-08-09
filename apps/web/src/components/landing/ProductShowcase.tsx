import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "../../lib/utils";
import { Reveal } from "./Reveal";

const VIEWS = [
  {
    id: "room",
    label: "Room",
    src: "/product/room.png",
    alt: "Room live session with plan, chat, and people panes for checkout-500",
    title: "The shared run",
    body: "Plan, room chat, and people in one surface. Steer mid-flight. Both browsers stay in sync.",
  },
  {
    id: "lobby",
    label: "Lobby",
    src: "/product/lobby.png",
    alt: "Room lobby listing live sessions with filters and templates",
    title: "Find a live room",
    body: "Linear-style lobby for running sessions, filters, and one-click templates.",
  },
  {
    id: "history",
    label: "History",
    src: "/product/history.png",
    alt: "Room history table with steers and handoffs for past sessions",
    title: "What happened, and why",
    body: "Replay the shared record: steers, handoffs, and how the run resolved.",
  },
] as const;

type ViewId = (typeof VIEWS)[number]["id"];

export function ProductShowcase() {
  const [active, setActive] = useState<ViewId>("room");
  const reduce = useReducedMotion();
  const current = VIEWS.find((v) => v.id === active) ?? VIEWS[0];

  return (
    <section className="relative mx-auto w-full max-w-[1400px] px-5 py-24 md:px-8 md:py-32">
      <Reveal>
        <h2 className="max-w-[14ch] text-3xl font-semibold tracking-tight text-[var(--color-text)] md:text-4xl">
          The product, not a mock
        </h2>
        <p className="mt-4 max-w-[48ch] text-base leading-relaxed text-[var(--color-muted)]">
          Real screens from Room: lobby, the live multiplayer canvas, and history.
        </p>
      </Reveal>

      <Reveal delay={0.08} className="mt-10">
        <div
          role="tablist"
          aria-label="Product views"
          className="inline-flex flex-wrap gap-1 rounded-lg border border-[var(--color-line)] bg-[var(--color-panel)] p-1"
        >
          {VIEWS.map((view) => {
            const selected = view.id === active;
            return (
              <button
                key={view.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setActive(view.id)}
                className={cn(
                  "relative rounded-md px-3.5 py-1.5 text-sm transition active:scale-[0.98]",
                  selected
                    ? "text-[var(--color-text)]"
                    : "text-[var(--color-muted)] hover:text-[var(--color-text)]",
                )}
              >
                {selected ? (
                  <motion.span
                    layoutId={reduce ? undefined : "product-tab"}
                    className="absolute inset-0 rounded-md bg-[var(--color-panel-2)]"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                ) : null}
                <span className="relative z-[1]">{view.label}</span>
              </button>
            );
          })}
        </div>
      </Reveal>

      <Reveal delay={0.12} className="mt-6">
        <div className="overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)] shadow-[0_40px_100px_rgba(0,0,0,0.45)]">
          <div className="flex items-center border-b border-[var(--color-line)] px-4 py-3">
            <span className="truncate font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-muted)]">
              room.app / {current.label.toLowerCase()}
            </span>
          </div>

          <div className="relative bg-[var(--color-ink)]">
            <AnimatePresence mode="wait">
              <motion.img
                key={current.id}
                src={current.src}
                alt={current.alt}
                className="block h-auto w-full"
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reduce ? undefined : { opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                loading={current.id === "room" ? "eager" : "lazy"}
                decoding="async"
              />
            </AnimatePresence>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <h3 className="text-base font-semibold tracking-tight text-[var(--color-text)]">
                {current.title}
              </h3>
              <p className="mt-1 max-w-[52ch] text-sm leading-relaxed text-[var(--color-muted)]">
                {current.body}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      </Reveal>

      <div className="mt-8 grid grid-cols-3 gap-3 md:gap-4">
        {VIEWS.map((view) => {
          const selected = view.id === active;
          return (
            <button
              key={view.id}
              type="button"
              onClick={() => setActive(view.id)}
              aria-label={`Show ${view.label} screenshot`}
              className={cn(
                "group overflow-hidden rounded-xl border transition active:scale-[0.99]",
                selected
                  ? "border-[var(--color-accent)]/70 ring-1 ring-[var(--color-accent)]/40"
                  : "border-[var(--color-line)] hover:border-[var(--color-muted)]/50",
              )}
            >
              <img
                src={view.src}
                alt=""
                className="aspect-[16/9] w-full object-contain object-top bg-[var(--color-ink)] opacity-80 transition group-hover:opacity-100"
                loading="lazy"
                decoding="async"
              />
            </button>
          );
        })}
      </div>
    </section>
  );
}
