"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import DataTable, { Column } from "@/components/ui/DataTable";
import InfoTooltip from "@/components/ui/InfoTooltip";
import Modal from "@/components/ui/Modal";
import StateMessage from "@/components/ui/StateMessage";
import type { FaqArticle } from "@/lib/types";

type LoadState = "loading" | "loaded" | "unreachable" | "error";

const STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"];

function statusTone(status: string): "gold" | "green" | "red" {
  if (status === "PUBLISHED") return "green";
  if (status === "ARCHIVED") return "red";
  return "gold";
}

const FAQ_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Entwurf",
  PUBLISHED: "Veröffentlicht",
  ARCHIVED: "Archiviert",
};
function faqStatusLabel(status: string): string {
  return FAQ_STATUS_LABEL[status] ?? status;
}

const inputClass =
  "w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-900 focus:border-phoenix-gold focus:outline-none focus:ring-1 focus:ring-phoenix-gold";
const labelClass = "mb-1 block text-xs font-medium text-neutral-600";

export default function FaqClient() {
  const [articles, setArticles] = useState<FaqArticle[]>([]);
  const [state, setState] = useState<LoadState>("loading");

  const [editing, setEditing] = useState<Partial<FaqArticle> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const res = await fetch("/api/faq");
      if (res.status === 502) {
        setState("unreachable");
        return;
      }
      if (!res.ok) {
        setState("error");
        return;
      }
      const data = await res.json().catch(() => null);
      setArticles(Array.isArray(data?.articles) ? data.articles : []);
      setState("loaded");
    } catch {
      setState("unreachable");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!editing?.title?.trim()) return;
    setBusy(true);
    setError(null);
    const isNew = editing.id === undefined;
    try {
      const res = await fetch(isNew ? "/api/faq" : `/api/faq/${editing.id}`, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editing.title,
          body: editing.body ?? "",
          category: editing.category || "allgemein",
          position: editing.position ?? 0,
          status: editing.status,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? `Fehler (Status ${res.status}).`);
        return;
      }
      setEditing(null);
      load();
    } catch {
      setError("Verbindung zum Backend fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  const columns: Column<FaqArticle>[] = [
    { header: "Titel", cell: (a) => a.title },
    { header: "Kategorie", cell: (a) => a.category },
    { header: "Position", info: "Reihenfolge in der Liste — kleinere Zahl erscheint weiter oben.", cell: (a) => a.position },
    { header: "Status", cell: (a) => <Badge tone={statusTone(a.status)}>{faqStatusLabel(a.status)}</Badge> },
    {
      header: "",
      cell: (a) => (
        <Button variant="secondary" onClick={() => { setEditing(a); setError(null); }}>
          Bearbeiten
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="flex items-center gap-1.5 text-xl font-semibold text-neutral-900">
            Hilfe / FAQ
            <InfoTooltip text="FAQ = 'Frequently Asked Questions' (häufig gestellte Fragen). Diese Einträge sieht der Nutzer im Hilfe-Bereich der App." />
          </h1>
          <p className="text-sm text-neutral-400">Wissensdatenbank-Artikel, sortiert nach Kategorie und Position (Reihenfolge).</p>
        </div>
        <Button
          onClick={() =>
            setEditing({ title: "", body: "", category: "allgemein", position: 0, status: "DRAFT" })
          }
        >
          Neuer Eintrag
        </Button>
      </div>

      <Card>
        {state === "loading" && <p className="py-8 text-center text-sm text-neutral-400">Wird geladen…</p>}
        {state === "unreachable" && (
          <StateMessage title="PHÖNIX Backend nicht erreichbar" description="Die Verbindung zum Backend konnte nicht hergestellt werden." />
        )}
        {state === "error" && (
          <StateMessage title="Einträge konnten nicht geladen werden" description="Ein unerwarteter Fehler ist aufgetreten." />
        )}
        {state === "loaded" && (
          <DataTable columns={columns} rows={articles} rowKey={(a) => String(a.id)} emptyMessage="Noch keine FAQ-Einträge" />
        )}
      </Card>

      {editing && (
        <Modal title={editing.id === undefined ? "Neuer FAQ-Eintrag" : "FAQ-Eintrag bearbeiten"} onClose={() => setEditing(null)}>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className={labelClass}>Titel</label>
              <input
                className={inputClass}
                value={editing.title ?? ""}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Text</label>
              <textarea
                rows={5}
                className={inputClass}
                value={editing.body ?? ""}
                onChange={(e) => setEditing({ ...editing, body: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>Kategorie</label>
                <input
                  className={inputClass}
                  value={editing.category ?? ""}
                  onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>Position</label>
                <input
                  type="number"
                  className={inputClass}
                  value={editing.position ?? 0}
                  onChange={(e) => setEditing({ ...editing, position: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className={labelClass}>Status</label>
                <select
                  className={inputClass}
                  value={editing.status ?? "DRAFT"}
                  onChange={(e) => setEditing({ ...editing, status: e.target.value })}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {faqStatusLabel(s)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {error && (
              <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setEditing(null)}>
                Abbrechen
              </Button>
              <Button type="submit" disabled={busy || !editing.title?.trim()}>
                {busy ? "…" : "Speichern"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
