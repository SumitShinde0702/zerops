import { BlurText } from "../react-bits/BlurText";
import { SpotlightCard } from "../react-bits/SpotlightCard";
import { TrueFocus } from "../react-bits/TrueFocus";
import { Reveal } from "./Reveal";

const IMPACTS = [
  {
    title: "Burned runs",
    body: "One wrong tool path and the thread is toast. You restart from zero while the incident is still live.",
    span: "md:col-span-7 md:row-span-2",
    tall: true,
  },
  {
    title: "Silent teammates",
    body: "Everyone else watches a screen share. They cannot redirect the agent without taking the keyboard.",
    span: "md:col-span-5",
    tall: false,
  },
  {
    title: "Gates too late",
    body: "Approvals land in Slack after the agent already opened the PR or touched prod-adjacent code.",
    span: "md:col-span-5",
    tall: false,
  },
];

const SOLUTIONS = [
  {
    title: "One shared session",
    body: "Presence, plan, and tool steps stream to every browser on the same room URL.",
  },
  {
    title: "Steer without restart",
    body: "Skip a step, rewrite the plan, or cancel a PR mid-run. Both sides see it land.",
  },
  {
    title: "Own the gate",
    body: "Take over ownership. Approve or reject gated actions before they ship.",
  },
];

export function ProblemImpactSolution() {
  return (
    <section className="relative mx-auto w-full max-w-[1400px] px-5 py-24 md:px-8 md:py-32">
      <div className="max-w-3xl">
        <BlurText
          text="Agent work is still single-player."
          className="text-3xl font-semibold leading-[1.15] tracking-tight text-[var(--color-text)] md:text-5xl"
          delay={80}
          direction="bottom"
        />
        <Reveal delay={0.08}>
          <p className="mt-6 max-w-[54ch] text-base leading-relaxed text-[var(--color-muted)] md:text-lg">
            Someone starts a solo agent run. The rest of the team watches a screen share, or waits for a paste.
            When the path goes wrong, you burn the thread and start over while the clock is still running.
          </p>
        </Reveal>
      </div>

      <div className="mt-16 md:mt-20">
        <Reveal>
          <h2 className="text-xl font-semibold tracking-tight text-[var(--color-text)] md:text-2xl">
            What that costs the room
          </h2>
        </Reveal>

        <div className="mt-8 grid gap-4 md:grid-cols-12 md:grid-rows-2">
          {IMPACTS.map((item, i) => (
            <Reveal key={item.title} delay={i * 0.06} className={item.span}>
              <SpotlightCard
                className={`h-full ${item.tall ? "min-h-[280px] md:min-h-full" : ""}`}
                spotlightColor="rgba(94, 106, 210, 0.2)"
              >
                <div
                  className={`flex h-full flex-col ${item.tall ? "justify-end gap-4" : "justify-end gap-3"}`}
                >
                  <h3 className="text-xl font-semibold tracking-tight text-[var(--color-text)] md:text-2xl">
                    {item.title}
                  </h3>
                  <p className="max-w-[40ch] text-sm leading-relaxed text-[var(--color-muted)] md:text-base">
                    {item.body}
                  </p>
                </div>
              </SpotlightCard>
            </Reveal>
          ))}
        </div>
      </div>

      <div className="mt-20 border-t border-[var(--color-line)] pt-16 md:mt-28 md:pt-20">
        <div className="grid gap-12 md:grid-cols-[1.15fr_0.85fr] md:items-end md:gap-16">
          <div>
            <Reveal>
              <p className="mb-8 max-w-[48ch] text-base leading-relaxed text-[var(--color-muted)] md:text-lg">
                Room turns the agent into a shared surface. Teammates join the same live run, watch tools stream,
                and change the plan before the damage is done.
              </p>
            </Reveal>
            <TrueFocus
              sentence="Join Steer Gate Resume"
              blurAmount={4}
              borderColor="#5e6ad2"
              glowColor="rgba(94, 106, 210, 0.4)"
              animationDuration={0.45}
              pauseBetweenAnimations={1.15}
              className="justify-start"
              wordClassName="text-[var(--color-text)]"
            />
          </div>

          <Reveal delay={0.1}>
            <ul className="divide-y divide-[var(--color-line)] border-y border-[var(--color-line)]">
              {SOLUTIONS.map((item) => (
                <li key={item.title} className="py-5">
                  <h3 className="text-sm font-semibold tracking-tight text-[var(--color-text)]">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">{item.body}</p>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
