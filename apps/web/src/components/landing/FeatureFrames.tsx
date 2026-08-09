import { Reveal } from "./Reveal";

const FRAMES = [
  {
    title: "Plan on a Miro grid",
    body: "Steps land as shared canvas nodes, not a private chat scroll.",
    tint: "from-[rgba(94,106,210,0.22)] to-transparent",
  },
  {
    title: "Kill, then resume",
    body: "Checkpoint the run, stop cleanly, and pick up from the same place.",
    tint: "from-[rgba(76,183,130,0.18)] to-transparent",
  },
  {
    title: "Built for Zerops",
    body: "Frontend, API with WebSocket, worker, Postgres, and Valkey on private net.",
    tint: "from-[rgba(242,201,76,0.14)] to-transparent",
  },
];

export function FeatureFrames() {
  return (
    <section className="mx-auto w-full max-w-[1400px] px-5 py-24 md:px-8 md:py-32">
      <Reveal>
        <h2 className="max-w-[16ch] text-3xl font-semibold tracking-tight text-[var(--color-text)] md:text-4xl">
          ChatGPT is Word 2003
        </h2>
        <p className="mt-4 max-w-[48ch] text-base leading-relaxed text-[var(--color-muted)]">
          Room is Docs for agents: shared ownership, live tools, and a canvas your team can actually steer.
        </p>
      </Reveal>

      <div className="mt-14 grid gap-4 md:grid-cols-12 md:gap-5">
        {FRAMES.map((frame, i) => (
          <Reveal
            key={frame.title}
            delay={i * 0.08}
            className={
              i === 0
                ? "md:col-span-7"
                : i === 1
                  ? "md:col-span-5"
                  : "md:col-span-12"
            }
          >
            <div className="relative min-h-[220px] overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)] p-6 md:min-h-[260px] md:p-8">
              <div
                className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${frame.tint}`}
              />
              <div className="miro-grid pointer-events-none absolute inset-0 opacity-40" />
              <div className="relative flex h-full flex-col justify-end">
                <h3 className="text-xl font-semibold tracking-tight text-[var(--color-text)] md:text-2xl">
                  {frame.title}
                </h3>
                <p className="mt-3 max-w-[40ch] text-sm leading-relaxed text-[var(--color-muted)] md:text-base">
                  {frame.body}
                </p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
