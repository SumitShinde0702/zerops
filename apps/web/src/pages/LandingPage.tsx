import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/utils";

export function LandingPage() {
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
          `Slack alert ${data.ticket?.id || ""} sent — open Slack and click Create Room.`,
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
    <div className="miro-grid min-h-screen">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded bg-[var(--color-accent)] text-xs">R</span>
          Room
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Link to="/about" className="text-[var(--color-muted)] hover:text-[var(--color-text)]">
            How Zerops is used
          </Link>
          <Link to="/app" className="rounded-md bg-[var(--color-panel)] px-3 py-1.5 border border-[var(--color-line)]">
            Go to rooms
          </Link>
        </div>
      </header>

      <section className="mx-auto flex min-h-[70vh] w-full max-w-5xl flex-col justify-center px-6 pb-16 pt-8">
        <p className="mb-4 text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">Multiplayer AI · YC RFS-shaped</p>
        <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-[var(--color-text)] md:text-6xl">
          Room
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-[var(--color-muted)]">
          ChatGPT is single-player autopilot. Room is pair-programming with an agent: it does one beat, then the room decides — steer, take over, or pick a path together.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/app"
            className="rounded-md bg-[var(--color-accent)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-accent-2)]"
          >
            Go to rooms
          </Link>
          <Link
            to="/app/new"
            className="rounded-md border border-[var(--color-line)] bg-[var(--color-panel)] px-4 py-2.5 text-sm font-medium hover:bg-[var(--color-panel-2)]"
          >
            Create a room
          </Link>
          <button
            type="button"
            onClick={triggerSlackDemo}
            disabled={demoState === "sending"}
            className="rounded-md border border-[var(--color-line)] px-4 py-2.5 text-sm font-medium hover:bg-[var(--color-panel-2)] disabled:opacity-60"
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
        ) : (
          <p className="mt-4 max-w-xl text-sm text-[var(--color-muted)]">
            Open rooms to join a live session. Optional: page Slack for the PagerDuty → Create Room recording flow.
          </p>
        )}
      </section>

      <section className="mx-auto w-full max-w-5xl px-6 pb-20">
        <h2 className="text-sm font-medium text-[var(--color-text)]">How it works</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {[
            ["Join", "Open the lobby, pick a live room, or create one."],
            ["Share", "Second browser joins the same URL — same chat, same wait states."],
            ["Steer", "Either person redirects or takes over; agent does one beat then waits."],
          ].map(([title, body]) => (
            <div key={title} className="panel rounded-lg p-4">
              <h3 className="text-sm font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-[var(--color-line)] px-6 py-6 text-center text-xs text-[var(--color-muted)]">
        Deployed on Zerops · Built for WeMakeDevs Zerops Challenge
      </footer>
    </div>
  );
}
