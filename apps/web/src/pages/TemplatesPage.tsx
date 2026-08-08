import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import type { Template } from "../lib/types";
import { api } from "../lib/utils";

export function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  useEffect(() => {
    api<Template[]>("/api/templates").then(setTemplates);
  }, []);

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-6 py-8">
        <h1 className="text-xl font-semibold">Templates</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">Engineering workflows ready for a shared agent room.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {templates.map((t) => (
            <div key={t.id} className="panel rounded-lg p-4">
              <h2 className="text-sm font-semibold">{t.name}</h2>
              <p className="mt-2 text-xs leading-relaxed text-[var(--color-muted)]">{t.description}</p>
              <ol className="mt-3 list-decimal space-y-1 pl-4 text-[11px] text-[var(--color-muted)]">
                {t.steps.slice(0, 4).map((s) => (
                  <li key={s}>{s}</li>
                ))}
                {t.steps.length > 4 && <li>…</li>}
              </ol>
              <Link
                to={`/app/new?template=${t.id}`}
                className="mt-4 inline-block text-xs text-[var(--color-accent-2)] hover:underline"
              >
                Use template
              </Link>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
