import { Link, NavLink } from "react-router-dom";
import { Boxes, History, LayoutTemplate, Orbit } from "lucide-react";
import { cn } from "../lib/utils";

const items = [
  { to: "/app", label: "Lobby", icon: Boxes },
  { to: "/app/history", label: "History", icon: History },
  { to: "/app/templates", label: "Templates", icon: LayoutTemplate },
  { to: "/about", label: "Zerops", icon: Orbit },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full min-h-screen bg-[var(--color-ink)] text-[var(--color-text)]">
      <aside className="flex w-56 shrink-0 flex-col border-r border-[var(--color-line)] bg-[var(--color-panel)]">
        <Link to="/" className="flex items-center gap-2 px-4 py-4 text-sm font-semibold tracking-tight">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-[var(--color-accent)] text-xs text-white">
            R
          </span>
          Room
        </Link>
        <nav className="flex flex-1 flex-col gap-0.5 px-2">
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/app"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm text-[var(--color-muted)] transition hover:bg-[var(--color-panel-2)] hover:text-[var(--color-text)]",
                  isActive && "bg-[var(--color-panel-2)] text-[var(--color-text)]",
                )
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>
        <p className="px-4 py-3 text-[11px] leading-relaxed text-[var(--color-muted)]">
          Multiplayer agents for teams. Built for the Zerops Challenge.
        </p>
      </aside>
      <main className="min-w-0 flex-1 overflow-auto">{children}</main>
    </div>
  );
}
