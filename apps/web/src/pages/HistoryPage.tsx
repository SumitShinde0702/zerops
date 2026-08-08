import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { StatusPill } from "../components/StatusPill";
import type { Room } from "../lib/types";
import { api } from "../lib/utils";

export function HistoryPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    api<Room[]>("/api/rooms?filter=all").then(setRooms);
  }, []);

  const filtered = rooms.filter((r) => r.title.toLowerCase().includes(q.toLowerCase()));

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-6 py-8">
        <h1 className="text-xl font-semibold">History</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">Shared record of what agents did and why.</p>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by title"
          className="mt-4 w-full max-w-sm rounded-md border border-[var(--color-line)] bg-[var(--color-panel)] px-3 py-2 text-sm"
        />
        <div className="mt-4 overflow-hidden rounded-lg border border-[var(--color-line)]">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--color-panel)] text-xs text-[var(--color-muted)]">
              <tr>
                <th className="px-4 py-2 font-medium">Room</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Steers</th>
                <th className="px-4 py-2 font-medium">Handoffs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-line)]">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-[var(--color-panel)]">
                  <td className="px-4 py-3">
                    <Link to={`/r/${r.id}`} className="hover:underline">
                      {r.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={r.status} />
                  </td>
                  <td className="px-4 py-3 text-[var(--color-muted)]">{r.steersCount}</td>
                  <td className="px-4 py-3 text-[var(--color-muted)]">{r.handoffsCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
