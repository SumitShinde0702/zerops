import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Crown, Pause, Play, Share2, Skull } from "lucide-react";
import { PresenceAvatars } from "../components/PresenceAvatars";
import { StatusPill } from "../components/StatusPill";
import type { Room, RoomEvent, RoomMember } from "../lib/types";
import { api, cn, wsUrl } from "../lib/utils";

function loadMember(roomId: string): RoomMember | null {
  try {
    const raw = sessionStorage.getItem(`room:${roomId}:member`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function RoomPage() {
  const { id = "" } = useParams();
  const [room, setRoom] = useState<Room | null>(null);
  const [events, setEvents] = useState<RoomEvent[]>([]);
  const [member, setMember] = useState<RoomMember | null>(null);
  const [steer, setSteer] = useState("");
  const [copied, setCopied] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    let me = loadMember(id);
    setMember(me);

    api<{ room: Room; events: RoomEvent[] }>(`/api/rooms/${id}`).then((d) => {
      setRoom(d.room);
      setEvents(d.events);
      if (!me && d.room.members[0]) {
        me = d.room.members[0];
        sessionStorage.setItem(`room:${id}:member`, JSON.stringify(me));
        setMember(me);
      }
    });

    const ws = new WebSocket(wsUrl(id));
    ws.onopen = () => {
      const m = loadMember(id);
      if (m) ws.send(JSON.stringify({ type: "hello", memberId: m.id }));
    };
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.room) setRoom(msg.room);
      if (msg.type === "snapshot" && msg.events) setEvents(msg.events);
      if (msg.type === "event" && msg.event) {
        setEvents((prev) => [...prev, msg.event]);
      }
    };
    return () => ws.close();
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events.length]);

  const canSteer = member && member.role !== "viewer";
  const joinLink = useMemo(() => `${window.location.origin}/join/${id}`, [id]);

  async function post(path: string, body: Record<string, unknown> = {}) {
    if (!member) return;
    await api(path, { method: "POST", body: JSON.stringify({ memberId: member.id, ...body }) });
  }

  if (!room || !member) {
    return (
      <div className="miro-grid flex min-h-screen items-center justify-center text-sm text-[var(--color-muted)]">
        Connecting to room…
      </div>
    );
  }

  return (
    <div className="miro-grid flex h-screen flex-col">
      <header className="panel flex items-center gap-3 border-b border-[var(--color-line)] px-4 py-3">
        <Link to="/app" className="text-xs text-[var(--color-muted)] hover:text-[var(--color-text)]">
          ← Lobby
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-sm font-semibold">{room.title}</h1>
            <StatusPill status={room.status} />
            <span className="text-xs text-[var(--color-muted)]">Owner {room.ownerName}</span>
          </div>
        </div>
        <PresenceAvatars members={room.members} />
        <button
          onClick={() => post(`/api/rooms/${id}/takeover`)}
          className="inline-flex items-center gap-1 rounded-md border border-[var(--color-line)] px-2 py-1.5 text-xs hover:bg-[var(--color-panel-2)]"
        >
          <Crown size={12} /> Take over
        </button>
        <button
          onClick={async () => {
            await navigator.clipboard.writeText(joinLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="inline-flex items-center gap-1 rounded-md border border-[var(--color-line)] px-2 py-1.5 text-xs"
        >
          <Share2 size={12} /> {copied ? "Copied" : "Share"}
        </button>
        <button onClick={() => post(`/api/rooms/${id}/pause`)} className="rounded-md border border-[var(--color-line)] p-1.5">
          <Pause size={14} />
        </button>
        <button onClick={() => post(`/api/rooms/${id}/kill`)} className="rounded-md border border-[var(--color-line)] p-1.5">
          <Skull size={14} />
        </button>
        <button onClick={() => post(`/api/rooms/${id}/resume`)} className="rounded-md border border-[var(--color-line)] p-1.5">
          <Play size={14} />
        </button>
      </header>

      <div className="grid min-h-0 flex-1 gap-3 p-3 lg:grid-cols-[240px_minmax(0,1fr)_280px]">
        <aside className="panel overflow-auto rounded-lg p-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">Plan</h2>
          <ol className="mt-3 space-y-2">
            {room.plan.map((step, i) => (
              <li
                key={step.id}
                className={cn(
                  "rounded-md border border-transparent px-2 py-1.5 text-sm",
                  step.status === "active" && "border-[var(--color-accent)] bg-[var(--color-panel-2)]",
                  step.status === "cancelled" && "text-[var(--color-muted)] line-through",
                  step.status === "done" && "text-[var(--color-good)]",
                )}
              >
                <span className="mr-2 text-xs text-[var(--color-muted)]">{i + 1}</span>
                {step.title}
              </li>
            ))}
          </ol>
        </aside>

        <section className="panel flex min-h-0 flex-col overflow-hidden rounded-lg">
          <div className="border-b border-[var(--color-line)] px-4 py-2 text-xs uppercase tracking-wide text-[var(--color-muted)]">
            Live run
          </div>
          <div className="flex-1 space-y-3 overflow-auto p-4">
            {events.map((ev) => (
              <EventCard key={ev.id} event={ev} />
            ))}
            {room.gate?.status === "open" && (
              <div className="rounded-lg border border-[var(--color-warn)] bg-[color-mix(in_srgb,var(--color-warn)_10%,transparent)] p-4">
                <p className="text-sm font-medium">Gate: {room.gate.title}</p>
                <p className="mt-1 text-xs text-[var(--color-muted)]">{room.gate.description}</p>
                <div className="mt-3 flex gap-2">
                  <button
                    disabled={!canSteer}
                    onClick={() => post(`/api/rooms/${id}/gate`, { decision: "approved" })}
                    className="rounded-md bg-[var(--color-good)] px-3 py-1.5 text-xs font-medium text-black disabled:opacity-40"
                  >
                    Approve
                  </button>
                  <button
                    disabled={!canSteer}
                    onClick={() => post(`/api/rooms/${id}/gate`, { decision: "rejected" })}
                    className="rounded-md border border-[var(--color-line)] px-3 py-1.5 text-xs disabled:opacity-40"
                  >
                    Reject
                  </button>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </section>

        <aside className="panel flex min-h-0 flex-col overflow-hidden rounded-lg">
          <div className="border-b border-[var(--color-line)] px-3 py-2 text-xs uppercase tracking-wide text-[var(--color-muted)]">
            People
          </div>
          <ul className="space-y-2 border-b border-[var(--color-line)] p-3">
            {room.members.map((m) => (
              <li key={m.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: m.color }} />
                  {m.name}
                  {m.id === room.ownerId && <Crown size={12} className="text-[var(--color-warn)]" />}
                </div>
                <span className="text-[11px] text-[var(--color-muted)]">
                  {m.role} · {m.mode}
                </span>
              </li>
            ))}
            <li className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-accent)]" /> Agent
            </li>
          </ul>

          <div className="flex min-h-0 flex-1 flex-col p-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">Steer</h3>
            <div className="mt-2 flex-1 space-y-2 overflow-auto text-xs text-[var(--color-muted)]">
              {events
                .filter((e) => e.type === "steer" || e.type === "handoff" || e.type === "gate.resolved")
                .slice(-12)
                .map((e) => (
                  <div key={e.id} className="rounded-md bg-[var(--color-ink)] px-2 py-1.5">
                    <span className="text-[var(--color-text)]">{e.actorName || "System"}</span>:{" "}
                    {String(e.payload.note || e.payload.message || e.payload.decision || e.type)}
                  </div>
                ))}
            </div>
            <form
              className="mt-2 flex gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!steer.trim() || !canSteer) return;
                await post(`/api/rooms/${id}/steer`, { message: steer.trim() });
                setSteer("");
              }}
            >
              <input
                value={steer}
                onChange={(e) => setSteer(e.target.value)}
                disabled={!canSteer}
                placeholder={canSteer ? "Redirect the agent…" : "View only"}
                className="min-w-0 flex-1 rounded-md border border-[var(--color-line)] bg-[var(--color-ink)] px-2 py-1.5 text-xs outline-none"
              />
              <button
                disabled={!canSteer}
                className="rounded-md bg-[var(--color-accent)] px-2 py-1.5 text-xs text-white disabled:opacity-40"
              >
                Send
              </button>
            </form>
            <p className="mt-2 text-[10px] text-[var(--color-muted)]">
              Try: “Don&apos;t open a PR. Stop after tests.”
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function EventCard({ event }: { event: RoomEvent }) {
  const p = event.payload;
  if (event.type === "step.tool") {
    return (
      <div className="rounded-lg border border-[var(--color-line)] bg-[var(--color-ink)] p-3 font-mono text-xs whitespace-pre-wrap">
        {p.thinking ? <div className="mb-2 text-[var(--color-muted)] italic">{String(p.thinking)}</div> : null}
        <div className="text-[var(--color-accent-2)]">tool: {String(p.tool)}</div>
        <div className="mt-1 text-[var(--color-muted)]">{String(p.detail)}</div>
        <div className="mt-2 text-[var(--color-good)]">→ {String(p.result)}</div>
      </div>
    );
  }
  if (event.type === "step.started" || event.type === "step.finished") {
    return (
      <div className="text-sm">
        <span className="text-[var(--color-muted)]">{event.type === "step.started" ? "Started" : "Finished"}</span>{" "}
        <span className="font-medium">{String(p.title)}</span>
      </div>
    );
  }
  if (event.type === "presence.join") {
    return <div className="text-xs text-[var(--color-good)]">{event.actorName} joined the room</div>;
  }
  if (event.type === "steer") {
    return (
      <div className="rounded-md border border-[var(--color-accent)]/40 bg-[var(--color-panel-2)] px-3 py-2 text-xs">
        Steer · {event.actorName}: {String(p.note || p.message)}
      </div>
    );
  }
  if (event.type === "handoff") {
    return <div className="text-xs text-[var(--color-warn)]">Handoff → {String(p.ownerName)} now owns the run</div>;
  }
  if (event.type === "checkpoint") {
    return <div className="text-[11px] text-[var(--color-muted)]">Checkpoint saved</div>;
  }
  if (event.type === "resumed") {
    return <div className="text-xs text-[var(--color-good)]">Resumed from checkpoint</div>;
  }
  if (event.type === "killed" || event.type === "paused") {
    return <div className="text-xs text-[var(--color-muted)]">Run {event.type}</div>;
  }
  return null;
}
