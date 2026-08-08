import type { RoomMember } from "../lib/types";

export function PresenceAvatars({ members }: { members: RoomMember[] }) {
  return (
    <div className="flex -space-x-2">
      {members.map((m) => (
        <div
          key={m.id}
          title={`${m.name} · ${m.mode}`}
          className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[var(--color-ink)] text-[10px] font-semibold text-white"
          style={{ background: m.color }}
        >
          {m.name.slice(0, 1).toUpperCase()}
        </div>
      ))}
    </div>
  );
}
