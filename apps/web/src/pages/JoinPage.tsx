import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PresenceAvatars } from "../components/PresenceAvatars";
import { StatusPill } from "../components/StatusPill";
import type { Room, RoomMember } from "../lib/types";
import { api, cn } from "../lib/utils";

export function JoinPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [name, setName] = useState("Alex");
  const [role, setRole] = useState<"editor" | "viewer">("editor");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    api<{ room: Room }>(`/api/rooms/${id}`).then((d) => setRoom(d.room)).catch(() => setRoom(null));
  }, [id]);

  async function enter() {
    if (!id) return;
    setBusy(true);
    try {
      const data = await api<{ room: Room; member: RoomMember }>(`/api/rooms/${id}/join`, {
        method: "POST",
        body: JSON.stringify({ name, role }),
      });
      sessionStorage.setItem(`room:${id}:member`, JSON.stringify(data.member));
      navigate(`/r/${id}`);
    } finally {
      setBusy(false);
    }
  }

  if (!room) {
    return (
      <div className="miro-grid flex min-h-screen items-center justify-center p-6">
        <div className="panel rounded-lg p-6 text-sm text-[var(--color-muted)]">Room not found.</div>
      </div>
    );
  }

  const current = room.plan.find((s) => s.status === "active") || room.plan[room.currentStepIndex];

  return (
    <div className="miro-grid flex min-h-screen items-center justify-center p-6">
      <div className="panel w-full max-w-md rounded-xl p-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-lg font-semibold">{room.title}</h1>
          <StatusPill status={room.status} />
        </div>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          Current step: {current?.title || "Waiting"} · Driver {room.ownerName}
        </p>
        <div className="mt-4">
          <PresenceAvatars members={room.members} />
        </div>

        <label className="mt-6 block text-xs text-[var(--color-muted)]">Display name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-md border border-[var(--color-line)] bg-[var(--color-ink)] px-3 py-2 text-sm"
        />

        <label className="mt-4 block text-xs text-[var(--color-muted)]">How are you joining?</label>
        <div className="mt-2 grid gap-2">
          <button
            type="button"
            onClick={() => setRole("editor")}
            className={cn(
              "rounded-md border px-3 py-2.5 text-left",
              role === "editor"
                ? "border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_15%,transparent)]"
                : "border-[var(--color-line)]",
            )}
          >
            <div className="text-sm font-medium">Editor · can steer</div>
            <div className="mt-0.5 text-[11px] text-[var(--color-muted)]">
              Send messages, click options, take over the driver seat.
            </div>
          </button>
          <button
            type="button"
            onClick={() => setRole("viewer")}
            className={cn(
              "rounded-md border px-3 py-2.5 text-left",
              role === "viewer"
                ? "border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_15%,transparent)]"
                : "border-[var(--color-line)]",
            )}
          >
            <div className="text-sm font-medium">Viewer · watch only</div>
            <div className="mt-0.5 text-[11px] text-[var(--color-muted)]">
              See the live chat. Cannot send, click pills, or take over.
            </div>
          </button>
        </div>

        <button
          disabled={busy}
          onClick={enter}
          className="mt-6 w-full rounded-md bg-[var(--color-accent)] py-2.5 text-sm font-medium text-white"
        >
          Enter room
        </button>
        <Link to="/app" className="mt-3 block text-center text-xs text-[var(--color-muted)]">
          Back to lobby
        </Link>
      </div>
    </div>
  );
}
