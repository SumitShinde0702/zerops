import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { PresenceAvatars } from "../components/PresenceAvatars";
import { StatusPill } from "../components/StatusPill";
import type { Room } from "../lib/types";
import { api } from "../lib/utils";

const filters = [
  { id: "all", label: "All" },
  { id: "running", label: "Running" },
  { id: "needs_you", label: "Needs you" },
  { id: "done", label: "Done" },
];

export function LobbyPage() {
  const [filter, setFilter] = useState("all");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  async function load() {
    setLoading(true);
    try {
      const data = await api<Room[]>(`/api/rooms?filter=${filter}`);
      setRooms(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [filter]);

  async function openDemo() {
    const data = await api<{ room: Room }>("/api/demo", { method: "POST" });
    const member = data.room.members[0];
    sessionStorage.setItem(`room:${data.room.id}:member`, JSON.stringify(member));
    navigate(`/r/${data.room.id}`);
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Rooms</h1>
            <p className="mt-1 text-sm text-[var(--color-muted)]">Shared live agent sessions for your team.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={openDemo}
              className="rounded-md border border-[var(--color-line)] px-3 py-2 text-sm hover:bg-[var(--color-panel-2)]"
            >
              Open seeded demo
            </button>
            <Link
              to="/app/new"
              className="rounded-md bg-[var(--color-accent)] px-3 py-2 text-sm font-medium text-white"
            >
              New room
            </Link>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`rounded-full px-3 py-1 text-xs ${
                filter === f.id
                  ? "bg-[var(--color-panel-2)] text-[var(--color-text)]"
                  : "text-[var(--color-muted)] hover:bg-[var(--color-panel)]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="mt-4 overflow-hidden rounded-lg border border-[var(--color-line)]">
          {loading && rooms.length === 0 ? (
            <p className="p-6 text-sm text-[var(--color-muted)]">Loading rooms…</p>
          ) : rooms.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-[var(--color-muted)]">No rooms yet. Start one or open the seeded demo.</p>
              <button onClick={openDemo} className="mt-4 text-sm text-[var(--color-accent-2)]">
                Open seeded demo room
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-[var(--color-line)]">
              {rooms.map((room) => (
                <li key={room.id} className="flex items-center gap-4 px-4 py-3 hover:bg-[var(--color-panel)]">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Link to={`/r/${room.id}`} className="truncate text-sm font-medium hover:underline">
                        {room.title}
                      </Link>
                      <StatusPill status={room.status} />
                    </div>
                    <p className="mt-1 text-xs text-[var(--color-muted)]">
                      Owner {room.ownerName} · updated {new Date(room.updatedAt).toLocaleTimeString()}
                      {typeof room.liveViewers === "number" ? ` · ${room.liveViewers} live` : ""}
                    </p>
                  </div>
                  <PresenceAvatars members={room.members} />
                  <Link
                    to={`/join/${room.id}`}
                    className="rounded-md border border-[var(--color-line)] px-3 py-1.5 text-xs hover:bg-[var(--color-panel-2)]"
                  >
                    Join
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-8">
          <h2 className="text-sm font-medium">Templates</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {["Debug production bug", "Review failing test", "Draft incident reply"].map((t) => (
              <Link
                key={t}
                to="/app/new"
                className="rounded-full border border-[var(--color-line)] px-3 py-1 text-xs text-[var(--color-muted)] hover:text-[var(--color-text)]"
              >
                {t}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
