import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/utils";
import { Reveal } from "./Reveal";

export function ClosingCta() {
  const [demoState, setDemoState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [demoHint, setDemoHint] = useState("");

  async function triggerSlackDemo() {
    setDemoState("sending");
    setDemoHint("");
    try {
      const data = await api<{ ok: boolean; hint?: string; ticket?: { id: string } }>(
        "/api/demo/slack",
        { method: "POST" },
      );
      setDemoState("sent");
      setDemoHint(
        data.hint ||
          `Slack alert ${data.ticket?.id || ""} sent. Open Slack and click Create Room.`,
      );
    } catch (err) {
      setDemoState("error");
      setDemoHint(
        err instanceof Error
          ? err.message
          : "Slack not configured. Add SLACK_BOT_TOKEN + SLACK_CHANNEL_ID to .env",
      );
    }
  }

  return (
    <section className="relative mx-auto w-full max-w-[1400px] px-5 pb-24 pt-8 md:px-8 md:pb-32">
      <Reveal className="overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)]">
        <div className="relative px-6 py-14 md:px-14 md:py-20">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_left_top,rgba(94,106,210,0.22),transparent_55%)]" />
          <div className="miro-grid pointer-events-none absolute inset-0 opacity-30" />

          <div className="relative max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight text-[var(--color-text)] md:text-5xl">
              Open a room. Bring a second browser.
            </h2>
            <p className="mt-4 max-w-[48ch] text-base leading-relaxed text-[var(--color-muted)]">
              Start with checkout-500, join from another tab, and prove multiplayer AI on Zerops.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/app"
                className="inline-flex items-center justify-center rounded-md bg-[var(--color-accent)] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-accent-2)] active:scale-[0.98]"
              >
                Open demo
              </Link>
              <button
                type="button"
                onClick={triggerSlackDemo}
                disabled={demoState === "sending"}
                className="inline-flex items-center justify-center rounded-md border border-[var(--color-line)] px-5 py-2.5 text-sm font-medium text-[var(--color-text)] transition hover:bg-[var(--color-panel-2)] active:scale-[0.98] disabled:opacity-60"
              >
                {demoState === "sending" ? "Paging Slack…" : "Page Slack incident"}
              </button>
            </div>

            {demoHint ? (
              <p
                className={`mt-4 max-w-xl text-sm ${
                  demoState === "error" ? "text-[var(--color-bad)]" : "text-[var(--color-good)]"
                }`}
              >
                {demoHint}
              </p>
            ) : null}
          </div>
        </div>
      </Reveal>
    </section>
  );
}
