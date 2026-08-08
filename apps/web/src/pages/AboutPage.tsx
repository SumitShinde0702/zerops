import { Link } from "react-router-dom";
import { AppShell } from "../components/AppShell";

export function AboutPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="text-xl font-semibold">How Zerops is used</h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
          Room is a multi-service app on Zerops: public web + API, private worker, with Postgres and Valkey available for persistence and presence at scale. Services talk over the project private network.
        </p>

        <div className="panel mt-6 rounded-lg p-4 font-mono text-xs leading-7 text-[var(--color-muted)]">
          <div>Public:  web (Vite) ──► api (HTTP + WebSocket)</div>
          <div>Private: worker ◄──► api · db (Postgres) · cache (Valkey)</div>
        </div>

        <h2 className="mt-8 text-sm font-semibold">YC Multiplayer AI mapping</h2>
        <ul className="mt-3 space-y-2 text-sm text-[var(--color-muted)]">
          <li>Shared live session → `/r/:id`</li>
          <li>Watch progress → WebSocket event stream</li>
          <li>Redirect mid-task → Steer panel</li>
          <li>Hand off → Take over</li>
          <li>Approve gates → Gate Approve/Reject</li>
          <li>Jump in cold → `/join/:id`</li>
        </ul>

        <p className="mt-8 text-sm">
          Config lives in <code className="text-[var(--color-accent-2)]">zerops.yaml</code> at the repo root.{" "}
          <Link to="/app" className="text-[var(--color-accent-2)] hover:underline">
            Back to lobby
          </Link>
        </p>
      </div>
    </AppShell>
  );
}
