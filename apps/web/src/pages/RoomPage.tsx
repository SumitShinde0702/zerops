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
  const [flash, setFlash] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    let me = loadMember(id);
    setMember(me);

    api<{ room: Room; events: RoomEvent[] }>(`/api/rooms/${id}`)
      .then((d) => {
        setRoom(d.room);
        setEvents(d.events);
        if (!me && d.room.members[0]) {
          me = d.room.members[0];
          sessionStorage.setItem(`room:${id}:member`, JSON.stringify(me));
          setMember(me);
        }
      })
      .catch(() => {
        setRoom(null);
        setMember(null);
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
        const t = msg.event.type as string;
        if (t === "paused") setFlash("Paused — agent will not continue until you resume");
        if (t === "checkpoint") setFlash("Checkpoint saved");
        if (t === "killed") setFlash("Run killed · checkpoint kept — hit Resume to continue");
        if (t === "resumed") setFlash("Resumed — your move");
      }
    };
    return () => ws.close();
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events.length]);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 3200);
    return () => clearTimeout(t);
  }, [flash]);

  const joinLink = useMemo(() => `${window.location.origin}/join/${id}`, [id]);

  async function post(path: string, body: Record<string, unknown> = {}) {
    if (!member) return;
    await api(path, { method: "POST", body: JSON.stringify({ memberId: member.id, ...body }) });
  }

  async function sendSteer(message: string) {
    if (!member || member.role === "viewer" || !message.trim()) return;
    if (room?.status === "paused") {
      setFlash("Room is paused — hit Resume first");
      return;
    }
    await post(`/api/rooms/${id}/steer`, { message: message.trim() });
    setSteer("");
  }

  if (!room || !member) {
    return (
      <div className="miro-grid flex min-h-screen items-center justify-center text-sm text-[var(--color-muted)]">
        Connecting to room…
      </div>
    );
  }

  const canSteer = member.role !== "viewer";
  const isDriver = room.ownerId === member.id;
  const waitingOnRoom = room.status === "awaiting_human" || room.status === "needs_you";
  const isPaused = room.status === "paused";

  return (
    <div
      className={cn(
        "miro-grid flex h-screen flex-col",
        isPaused && "ring-2 ring-inset ring-[var(--color-bad)]",
      )}
    >
      <header className="panel flex items-center gap-3 border-b border-[var(--color-line)] px-4 py-3">
        <Link to="/app" className="text-xs text-[var(--color-muted)] hover:text-[var(--color-text)]">
          ← Lobby
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-sm font-semibold">{room.title}</h1>
            <StatusPill status={room.status} />
            <span className="text-xs text-[var(--color-muted)]">Driver {room.ownerName}</span>
            {(() => {
              const last = [...events].reverse().find((e) => e.type === "steer");
              return last?.actorName ? (
                <span className="text-xs text-[var(--color-accent-2)]">Last steer · {last.actorName}</span>
              ) : null;
            })()}
          </div>
        </div>
        <PresenceAvatars members={room.members} />
        <button
          onClick={() => post(`/api/rooms/${id}/takeover`)}
          disabled={!canSteer}
          className="inline-flex items-center gap-1 rounded-md border border-[var(--color-line)] px-2 py-1.5 text-xs hover:bg-[var(--color-panel-2)] disabled:opacity-40"
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
        <button
          title="Pause"
          onClick={() => post(`/api/rooms/${id}/pause`)}
          className={cn(
            "rounded-md border p-1.5",
            isPaused
              ? "border-[var(--color-bad)] bg-[color-mix(in_srgb,var(--color-bad)_25%,transparent)] text-[var(--color-bad)]"
              : "border-[var(--color-line)] hover:border-[var(--color-warn)]",
          )}
        >
          <Pause size={14} />
        </button>
        <button
          title="Kill + checkpoint"
          onClick={() => post(`/api/rooms/${id}/kill`)}
          className="rounded-md border border-[var(--color-line)] p-1.5 hover:border-[var(--color-bad)] hover:text-[var(--color-bad)]"
        >
          <Skull size={14} />
        </button>
        <button
          title="Resume"
          onClick={() => post(`/api/rooms/${id}/resume`)}
          className={cn(
            "rounded-md border p-1.5",
            isPaused
              ? "border-[var(--color-good)] bg-[color-mix(in_srgb,var(--color-good)_25%,transparent)] text-[var(--color-good)]"
              : "border-[var(--color-line)]",
          )}
        >
          <Play size={14} />
        </button>
        {room.status !== "done" && (
          <button
            title="Mark resolved · notify Slack thread"
            disabled={!canSteer}
            onClick={async () => {
              const data = await api<{ slack?: { posted?: boolean } }>(`/api/rooms/${id}/resolve`, {
                method: "POST",
                body: JSON.stringify({
                  memberId: member.id,
                  summary: "Incident resolved in Room — shared agent session complete.",
                }),
              });
              setFlash(
                data.slack?.posted
                  ? "Resolved — Slack thread updated with room link"
                  : "Resolved in Room (no Slack ticket linked)",
              );
            }}
            className="rounded-md border border-[var(--color-good)] px-2 py-1.5 text-xs text-[var(--color-good)] hover:bg-[color-mix(in_srgb,var(--color-good)_15%,transparent)] disabled:opacity-40"
          >
            Resolve
          </button>
        )}
      </header>

      {flash && (
        <div
          className={cn(
            "border-b px-4 py-2 text-center text-sm font-medium",
            isPaused
              ? "border-[var(--color-bad)] bg-[color-mix(in_srgb,var(--color-bad)_18%,transparent)] text-[var(--color-bad)]"
              : "border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_15%,transparent)] text-[var(--color-text)]",
          )}
        >
          {flash}
        </div>
      )}

      {isPaused && !flash && (
        <div className="border-b border-[var(--color-bad)] bg-[color-mix(in_srgb,var(--color-bad)_18%,transparent)] px-4 py-2 text-center text-sm font-medium text-[var(--color-bad)]">
          Paused — agent frozen. Hit the green Resume to continue.
        </div>
      )}

      {waitingOnRoom && !isPaused && (
        <div className="border-b border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_18%,transparent)] px-4 py-2">
          <p className="text-sm font-medium">
            {room.status === "needs_you"
              ? "Your turn — pick a path or type below. Agent will not continue alone."
              : isDriver
                ? "Your turn — send the next instruction."
                : `${room.ownerName} is driving. Take over to talk to the agent.`}
          </p>
        </div>
      )}

      <div className="grid min-h-0 flex-1 gap-3 p-3 lg:grid-cols-[200px_minmax(0,1fr)_220px]">
        <aside className="panel hidden overflow-auto rounded-lg p-3 lg:block">
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
            Room chat
          </div>
          <div className="flex-1 space-y-3 overflow-auto px-3 py-4">
            {events.map((ev) => (
              <ChatBubble key={ev.id} event={ev} myId={member.id} />
            ))}
            {room.gate?.status === "open" && (
              <div className="mx-auto max-w-md rounded-lg border border-[var(--color-warn)] bg-[color-mix(in_srgb,var(--color-warn)_10%,transparent)] p-4">
                <p className="text-sm font-medium">{room.gate.title}</p>
                <p className="mt-1 whitespace-pre-wrap text-xs text-[var(--color-muted)]">
                  {linkify(stripUiText(room.gate.description))}
                </p>
                {room.gate.options && room.gate.options.length > 0 ? (
                  <div className="mt-3 flex flex-col gap-2">
                    {room.gate.options.map((opt) => (
                      <button
                        key={opt}
                        disabled={!canSteer || isPaused}
                        onClick={() =>
                          post(`/api/rooms/${id}/gate`, { decision: "approved", choice: opt })
                        }
                        className="rounded-md border border-[var(--color-line)] bg-[var(--color-panel)] px-3 py-2 text-left text-xs hover:border-[var(--color-accent)] disabled:opacity-40"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-[var(--color-line)] bg-[var(--color-panel)] p-3">
            {waitingOnRoom && room.promptHints && room.promptHints.length > 0 && canSteer && !isPaused && (
              <div className="mb-2 flex flex-wrap gap-2">
                {room.promptHints.map((hint) => {
                  const clean = stripUiText(hint);
                  if (!clean) return null;
                  return (
                    <button
                      key={hint}
                      onClick={() => sendSteer(clean)}
                      className="rounded-full border border-[var(--color-line)] bg-[var(--color-ink)] px-3 py-1 text-xs hover:border-[var(--color-accent)]"
                    >
                      {clean}
                    </button>
                  );
                })}
              </div>
            )}
            <form
              className="flex gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                await sendSteer(steer);
              }}
            >
              <input
                value={steer}
                onChange={(e) => setSteer(e.target.value)}
                disabled={!canSteer || isPaused}
                placeholder={
                  isPaused
                    ? "Paused — resume to send"
                    : waitingOnRoom
                      ? "Message the agent…"
                      : canSteer
                        ? "Interrupt / redirect…"
                        : "View only"
                }
                className="min-w-0 flex-1 rounded-xl border border-[var(--color-line)] bg-[var(--color-ink)] px-3 py-2.5 text-sm outline-none focus:border-[var(--color-accent)]"
              />
              <button
                disabled={!canSteer || isPaused}
                className="rounded-xl bg-[var(--color-accent)] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40"
              >
                Send
              </button>
            </form>
          </div>
        </section>

        <aside className="panel flex min-h-0 flex-col overflow-hidden rounded-lg">
          <div className="border-b border-[var(--color-line)] px-3 py-2 text-xs uppercase tracking-wide text-[var(--color-muted)]">
            People
          </div>
          <ul className="space-y-2 p-3">
            {room.members.map((m) => (
              <li key={m.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: m.color }} />
                  {m.name}
                  {m.id === room.ownerId && <Crown size={12} className="text-[var(--color-warn)]" />}
                  {m.id === member.id && <span className="text-[10px] text-[var(--color-muted)]">(you)</span>}
                </div>
                <span className="text-[11px] text-[var(--color-muted)]">{m.mode}</span>
              </li>
            ))}
            <li className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-accent)]" /> Agent
            </li>
          </ul>
          <p className="mt-auto border-t border-[var(--color-line)] p-3 text-[11px] leading-relaxed text-[var(--color-muted)]">
            {canSteer
              ? "You can steer. Multiplayer proof: Share → second browser as editor, or viewer to watch-only."
              : "You're a viewer — watch only. Rejoin as editor to send messages / take over."}
          </p>
        </aside>
      </div>
    </div>
  );
}

function stripUiText(value: unknown): string {
  return String(value ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function linkify(text: string) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return parts.map((part, i) =>
    part.startsWith("http") ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noreferrer"
        className="break-all underline decoration-[var(--color-accent-2)] underline-offset-2 hover:text-[var(--color-accent-2)]"
        onClick={(e) => e.stopPropagation()}
      >
        {part}
      </a>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

function ChatBubble({ event, myId }: { event: RoomEvent; myId: string }) {
  const p = event.payload;

  if (event.type === "steer") {
    const mine = event.actorId === myId;
    const text = stripUiText(p.message || p.note);
    if (!text) return null;
    return (
      <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
        <div
          className={cn(
            "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm",
            mine
              ? "rounded-br-md bg-[var(--color-accent)] text-white"
              : "rounded-bl-md bg-[var(--color-panel-2)] text-[var(--color-text)]",
          )}
        >
          <div className={cn("mb-0.5 text-[10px] font-medium", mine ? "opacity-80" : "opacity-70")}>
            {event.actorName || (mine ? "You" : "Someone")}
          </div>
          {text}
        </div>
      </div>
    );
  }

  if (event.type === "step.tool") {
    const tool = String(p.tool || "");
    if (tool === "agent.steer") return null;
    if (tool === "pagerduty.alert") {
      return (
        <div className="rounded-lg border border-[var(--color-bad)]/50 bg-[color-mix(in_srgb,var(--color-bad)_10%,transparent)] px-3.5 py-2.5 text-sm">
          <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-[var(--color-bad)]">
            PagerDuty
          </div>
          <pre className="whitespace-pre-wrap font-sans text-[var(--color-text)]">{stripUiText(p.result)}</pre>
        </div>
      );
    }
    if (tool === "git.log") {
      return (
        <div className="flex justify-start">
          <div className="max-w-[95%] rounded-2xl rounded-bl-md border border-[var(--color-line)] bg-[var(--color-ink)] px-3.5 py-2.5 text-sm">
            <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-[var(--color-accent-2)]">
              Shared context · recent commits
            </div>
            {p.thinking ? <p className="mb-2 text-xs italic text-[var(--color-muted)]">{stripUiText(p.thinking)}</p> : null}
            <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-[11px] text-[var(--color-muted)]">
              {stripUiText(p.result)}
            </pre>
          </div>
        </div>
      );
    }
    if (tool === "github.pr" || tool === "status.page") {
      const url = stripUiText(p.url) || stripUiText(p.result).match(/https?:\/\/[^\s]+/)?.[0] || "";
      return (
        <div className="flex justify-start">
          <div className="max-w-[90%] rounded-2xl rounded-bl-md border border-[var(--color-good)]/40 bg-[color-mix(in_srgb,var(--color-good)_10%,transparent)] px-3.5 py-2.5 text-sm">
            <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-[var(--color-good)]">
              {tool === "github.pr" ? "Draft pull request" : "Draft status update"}
            </div>
            <p className="whitespace-pre-wrap text-[var(--color-text)]">{linkify(stripUiText(p.result))}</p>
            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-xs font-medium text-[var(--color-accent-2)] underline"
              >
                Open link →
              </a>
            ) : null}
          </div>
        </div>
      );
    }
    if (tool === "plan.redirect") {
      return (
        <div className="rounded-lg border border-[var(--color-warn)] bg-[color-mix(in_srgb,var(--color-warn)_12%,transparent)] px-3 py-2 text-center text-xs font-medium text-[var(--color-warn)]">
          {stripUiText(p.result)}
        </div>
      );
    }
    const isReply = tool === "agent.reply";
    return (
      <div className="flex justify-start">
        <div className="max-w-[90%] rounded-2xl rounded-bl-md border border-[var(--color-line)] bg-[var(--color-ink)] px-3.5 py-2.5 text-sm">
          <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-[var(--color-accent-2)]">
            Agent{isReply ? "" : ` · ${tool}`}
          </div>
          {p.thinking && !isReply ? (
            <p className="mb-1 text-xs italic text-[var(--color-muted)]">{stripUiText(p.thinking)}</p>
          ) : null}
          {!isReply && p.detail ? <p className="text-xs text-[var(--color-muted)]">{stripUiText(p.detail)}</p> : null}
          <p className="mt-1 whitespace-pre-wrap text-[var(--color-text)]">{linkify(stripUiText(p.result))}</p>
        </div>
      </div>
    );
  }

  if (event.type === "ask.human") {
    return (
      <div className="flex justify-start">
        <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-[var(--color-accent)]/50 bg-[color-mix(in_srgb,var(--color-accent)_12%,transparent)] px-3.5 py-2.5 text-sm">
          <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-[var(--color-accent-2)]">
            Agent · waiting
          </div>
          {stripUiText(p.question)}
        </div>
      </div>
    );
  }

  if (event.type === "room.updated" && p.status === "done") {
    return (
      <div className="rounded-lg border border-[var(--color-good)] bg-[color-mix(in_srgb,var(--color-good)_12%,transparent)] px-3 py-2 text-center text-xs font-medium text-[var(--color-good)]">
        Resolved{p.summary ? ` — ${stripUiText(p.summary)}` : ""}
      </div>
    );
  }

  if (event.type === "step.started" || event.type === "step.finished") {
    return (
      <div className="text-center text-[11px] text-[var(--color-muted)]">
        {event.type === "step.started" ? "Working on" : "Finished"} · {stripUiText(p.title)}
      </div>
    );
  }

  if (event.type === "presence.join") {
    return (
      <div className="text-center text-[11px] text-[var(--color-good)]">{event.actorName} joined</div>
    );
  }

  if (event.type === "handoff") {
    return (
      <div className="text-center text-[11px] text-[var(--color-warn)]">
        {String(p.ownerName)} took over — agent waits on them
      </div>
    );
  }

  if (event.type === "paused") {
    return (
      <div className="rounded-lg border border-[var(--color-bad)] bg-[color-mix(in_srgb,var(--color-bad)_12%,transparent)] px-3 py-2 text-center text-xs font-medium text-[var(--color-bad)]">
        Run paused
      </div>
    );
  }

  if (event.type === "checkpoint") {
    return (
      <div className="text-center text-[11px] text-[var(--color-muted)]">
        Checkpoint saved at step {String(p.stepIndex ?? "")}
      </div>
    );
  }

  if (event.type === "killed") {
    return (
      <div className="rounded-lg border border-[var(--color-bad)] bg-[color-mix(in_srgb,var(--color-bad)_12%,transparent)] px-3 py-2 text-center text-xs font-medium text-[var(--color-bad)]">
        Run killed · checkpoint kept
      </div>
    );
  }

  if (event.type === "resumed") {
    return (
      <div className="text-center text-[11px] text-[var(--color-good)]">Resumed from checkpoint</div>
    );
  }

  return null;
}
