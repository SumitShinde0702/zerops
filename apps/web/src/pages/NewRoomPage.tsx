import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import type { Room, RoomMember, Template } from "../lib/types";
import { api } from "../lib/utils";

export function NewRoomPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateId, setTemplateId] = useState("checkout-500");
  const [title, setTitle] = useState("");
  const [ownerName, setOwnerName] = useState("You");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    api<Template[]>("/api/templates").then((t) => {
      setTemplates(t);
      const pref = params.get("template");
      if (pref && t.some((x) => x.id === pref)) setTemplateId(pref);
    });
  }, [params]);

  async function create() {
    setBusy(true);
    try {
      const data = await api<{ room: Room; member: RoomMember }>("/api/rooms", {
        method: "POST",
        body: JSON.stringify({ title, templateId, ownerName }),
      });
      sessionStorage.setItem(`room:${data.room.id}:member`, JSON.stringify(data.member));
      navigate(`/r/${data.room.id}`);
    } finally {
      setBusy(false);
    }
  }

  const selected = templates.find((t) => t.id === templateId);

  return (
    <AppShell>
      <div className="mx-auto max-w-xl px-6 py-8">
        <h1 className="text-xl font-semibold">Create room</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">Start a long-running shared agent task.</p>

        <label className="mt-6 block text-xs text-[var(--color-muted)]">Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={selected?.name || "Room title"}
          className="mt-1 w-full rounded-md border border-[var(--color-line)] bg-[var(--color-panel)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
        />

        <label className="mt-4 block text-xs text-[var(--color-muted)]">Your display name</label>
        <input
          value={ownerName}
          onChange={(e) => setOwnerName(e.target.value)}
          className="mt-1 w-full rounded-md border border-[var(--color-line)] bg-[var(--color-panel)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
        />

        <label className="mt-4 block text-xs text-[var(--color-muted)]">Template</label>
        <div className="mt-2 space-y-2">
          {templates.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTemplateId(t.id)}
              className={`w-full rounded-lg border px-3 py-3 text-left ${
                templateId === t.id
                  ? "border-[var(--color-accent)] bg-[var(--color-panel-2)]"
                  : "border-[var(--color-line)] bg-[var(--color-panel)]"
              }`}
            >
              <div className="text-sm font-medium">{t.name}</div>
              <div className="mt-1 text-xs text-[var(--color-muted)]">{t.description}</div>
            </button>
          ))}
        </div>

        {selected && (
          <ol className="mt-4 list-decimal space-y-1 pl-5 text-xs text-[var(--color-muted)]">
            {selected.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        )}

        <button
          disabled={busy}
          onClick={create}
          className="mt-6 rounded-md bg-[var(--color-accent)] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
        >
          {busy ? "Starting…" : "Create & start"}
        </button>
      </div>
    </AppShell>
  );
}
