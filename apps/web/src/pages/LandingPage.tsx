import { Link } from "react-router-dom";

export function LandingPage() {
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
            Open app
          </Link>
        </div>
      </header>

      <section className="mx-auto flex min-h-[70vh] w-full max-w-5xl flex-col justify-center px-6 pb-16 pt-8">
        <p className="mb-4 text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">Multiplayer AI · YC RFS-shaped</p>
        <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-[var(--color-text)] md:text-6xl">
          Room
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-[var(--color-muted)]">
          ChatGPT is single-player. Room is Google Docs for agents — drop into the same live session, watch it work, redirect mid-run, and hand it off.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/app"
            className="rounded-md bg-[var(--color-accent)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-accent-2)]"
          >
            Open live demo
          </Link>
          <Link
            to="/app/new"
            className="rounded-md border border-[var(--color-line)] bg-[var(--color-panel)] px-4 py-2.5 text-sm font-medium hover:bg-[var(--color-panel-2)]"
          >
            Create a room
          </Link>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-6 pb-20">
        <h2 className="text-sm font-medium text-[var(--color-text)]">How it works</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {[
            ["Start", "Launch a long-running engineering agent in a shared workspace."],
            ["Invite", "Teammates join the same URL and see every tool call live."],
            ["Steer / Hand off", "Redirect mid-task, approve gates, transfer ownership without killing context."],
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
