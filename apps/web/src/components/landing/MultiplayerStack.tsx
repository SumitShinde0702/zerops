import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";

const BEATS = [
  {
    title: "Presence on join",
    body: "Two browsers, same room URL. Avatars land together the second someone joins.",
    accent: "var(--color-accent)",
  },
  {
    title: "Steer mid-run",
    body: "Skip the PR. Redirect the plan. Both sides see the agent replan in real time.",
    accent: "var(--color-good)",
  },
  {
    title: "Gate and hand off",
    body: "Approve or reject gated actions. Take over ownership without killing the session.",
    accent: "var(--color-warn)",
  },
];

function StackCard({
  beat,
  index,
}: {
  beat: (typeof BEATS)[number];
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "start start"],
  });

  const scale = useTransform(scrollYProgress, [0, 1], [0.94, 1]);
  const opacity = useTransform(scrollYProgress, [0, 1], [0.55, 1]);

  return (
    <div ref={ref} className="sticky top-0 flex min-h-[100dvh] items-center py-16">
      <motion.article
        style={reduce ? undefined : { scale, opacity }}
        className="relative w-full overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)]"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background: `radial-gradient(ellipse at ${20 + index * 25}% 0%, color-mix(in srgb, ${beat.accent} 28%, transparent), transparent 55%)`,
          }}
        />
        <div className="relative grid gap-8 px-6 py-10 md:grid-cols-[0.85fr_1.15fr] md:px-12 md:py-16">
          <div>
            <h3 className="max-w-[12ch] text-3xl font-semibold tracking-tight text-[var(--color-text)] md:text-5xl">
              {beat.title}
            </h3>
          </div>
          <p className="max-w-[42ch] self-end text-base leading-relaxed text-[var(--color-muted)] md:text-lg">
            {beat.body}
          </p>
        </div>
      </motion.article>
    </div>
  );
}

export function MultiplayerStack() {
  return (
    <section className="relative mx-auto w-full max-w-[1100px] px-5 md:px-8">
      <div className="mx-auto max-w-2xl pb-6 pt-24 md:pt-32">
        <h2 className="text-3xl font-semibold tracking-tight text-[var(--color-text)] md:text-4xl">
          Multiplayer is the product
        </h2>
        <p className="mt-4 max-w-[52ch] text-base leading-relaxed text-[var(--color-muted)]">
          If a second person cannot change the run, it is not Room. These three beats are the demo proof.
        </p>
      </div>

      <div className="relative">
        {BEATS.map((beat, index) => (
          <StackCard key={beat.title} beat={beat} index={index} />
        ))}
      </div>
    </section>
  );
}
