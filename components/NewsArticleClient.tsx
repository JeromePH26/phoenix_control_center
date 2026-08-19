"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import StateMessage from "@/components/ui/StateMessage";
import type { EditorialArticle } from "@/lib/types";

type LoadState = "loading" | "loaded" | "notfound" | "unreachable" | "error";

const inputClass =
  "w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-900 focus:border-phoenix-gold focus:outline-none focus:ring-1 focus:ring-phoenix-gold";
const labelClass = "mb-1 block text-xs font-medium text-neutral-600";

const STATUS_ACTIONS: { status: string; label: string; variant: "primary" | "secondary" | "danger" }[] = [
  { status: "DRAFT", label: "Zurück zu Entwurf", variant: "secondary" },
  { status: "PUBLISHED", label: "Veröffentlichen", variant: "primary" },
  { status: "HIDDEN", label: "Verstecken", variant: "secondary" },
  { status: "ARCHIVED", label: "Archivieren", variant: "danger" },
];

export default function NewsArticleClient({ id }: { id: string }) {
  const router = useRouter();
  const isNew = id === "new";

  const [state, setState] = useState<LoadState>(isNew ? "loaded" : "loading");
  const [article, setArticle] = useState<Partial<EditorialArticle>>({
    title: "",
    summary: "",
    body: "",
    category: "allgemein",
    image_url: "",
    homepage_feature: false,
    breaking: false,
    send_push: false,
    scheduled_at: null,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusBusy, setStatusBusy] = useState(false);

  const load = useCallback(async () => {
    if (isNew) return;
    setState("loading");
    try {
      const res = await fetch(`/api/news/${encodeURIComponent(id)}`);
      if (res.status === 404) {
        setState("notfound");
        return;
      }
      if (res.status === 502) {
        setState("unreachable");
        return;
      }
      if (!res.ok) {
        setState("error");
        return;
      }
      const data = await res.json().catch(() => null);
      setArticle(data?.article ?? {});
      setState("loaded");
    } catch {
      setState("unreachable");
    }
  }, [id, isNew]);

  useEffect(() => {
    load();
  }, [load]);

  function field<K extends keyof EditorialArticle>(key: K, value: EditorialArticle[K]) {
    setArticle((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const payload = {
      title: article.title,
      summary: article.summary,
      body: article.body,
      category: article.category,
      imageUrl: article.image_url || null,
      homepageFeature: article.homepage_feature ?? false,
      breaking: article.breaking ?? false,
      sendPush: article.send_push ?? false,
      scheduledAt: article.scheduled_at || null,
    };
    try {
      const res = await fetch(isNew ? "/api/news" : `/api/news/${encodeURIComponent(id)}`, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? `Fehler (Status ${res.status}).`);
        return;
      }
      if (isNew) {
        router.push(`/content/news/${data.article.id}`);
      } else {
        setArticle(data.article);
      }
    } catch {
      setError("Verbindung zum Backend fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(status: string) {
    setStatusBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/news/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? `Fehler (Status ${res.status}).`);
        return;
      }
      setArticle(data.article);
    } catch {
      setError("Verbindung zum Backend fehlgeschlagen.");
    } finally {
      setStatusBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/content/news" className="text-xs text-neutral-400 hover:text-neutral-600">
          ← Zurück zu News
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-neutral-900">{isNew ? "Neuer Artikel" : "Artikel bearbeiten"}</h1>
      </div>

      {state === "loading" && <p className="text-sm text-neutral-400">Wird geladen…</p>}
      {state === "notfound" && <StateMessage title="Artikel nicht gefunden" description="Für diese ID liegen keine Daten vor." />}
      {state === "unreachable" && (
        <StateMessage title="PHÖNIX Backend nicht erreichbar" description="Die Verbindung zum Backend konnte nicht hergestellt werden." />
      )}
      {state === "error" && (
        <StateMessage title="Artikel konnte nicht geladen werden" description="Ein unerwarteter Fehler ist aufgetreten." />
      )}

      {state === "loaded" && (
        <>
          {!isNew && (
            <Card title="Status" action={<Badge tone="gold">{article.status}</Badge>}>
              <div className="flex flex-wrap gap-2">
                {STATUS_ACTIONS.map((a) => (
                  <Button
                    key={a.status}
                    variant={a.variant}
                    disabled={statusBusy || article.status === a.status}
                    onClick={() => handleStatusChange(a.status)}
                  >
                    {a.label}
                  </Button>
                ))}
              </div>
              {article.push_sent_at && (
                <p className="mt-2 text-xs text-neutral-400">Push gesendet am {article.push_sent_at}</p>
              )}
            </Card>
          )}

          <Card title="Inhalt">
            <div className="space-y-3">
              <div>
                <label className={labelClass}>Titel</label>
                <input className={inputClass} value={article.title ?? ""} onChange={(e) => field("title", e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Zusammenfassung</label>
                <textarea
                  rows={2}
                  className={inputClass}
                  value={article.summary ?? ""}
                  onChange={(e) => field("summary", e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Text</label>
                <textarea
                  rows={8}
                  className={inputClass}
                  value={article.body ?? ""}
                  onChange={(e) => field("body", e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Kategorie</label>
                  <input className={inputClass} value={article.category ?? ""} onChange={(e) => field("category", e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Titelbild-URL</label>
                  <input className={inputClass} value={article.image_url ?? ""} onChange={(e) => field("image_url", e.target.value)} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Veröffentlichung planen (optional)</label>
                <input
                  type="datetime-local"
                  className={inputClass}
                  value={article.scheduled_at ? article.scheduled_at.slice(0, 16) : ""}
                  onChange={(e) => field("scheduled_at", e.target.value ? new Date(e.target.value).toISOString() : null)}
                />
              </div>
              <div className="flex flex-wrap gap-4 pt-1">
                <label className="flex items-center gap-2 text-sm text-neutral-600">
                  <input type="checkbox" checked={article.homepage_feature ?? false} onChange={(e) => field("homepage_feature", e.target.checked)} />
                  Homepage-Feature
                </label>
                <label className="flex items-center gap-2 text-sm text-neutral-600">
                  <input type="checkbox" checked={article.breaking ?? false} onChange={(e) => field("breaking", e.target.checked)} />
                  Breaking
                </label>
                <label className="flex items-center gap-2 text-sm text-neutral-600">
                  <input type="checkbox" checked={article.send_push ?? false} onChange={(e) => field("send_push", e.target.checked)} />
                  Push bei Veröffentlichung senden
                </label>
              </div>
            </div>

            {error && (
              <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}

            <div className="mt-4">
              <Button onClick={handleSave} disabled={saving || !article.title?.trim()}>
                {saving ? "…" : isNew ? "Erstellen" : "Speichern"}
              </Button>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
