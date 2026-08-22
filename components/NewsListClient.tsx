"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import DataTable, { Column } from "@/components/ui/DataTable";
import InfoTooltip from "@/components/ui/InfoTooltip";
import LoadingState from "@/components/ui/LoadingState";
import StateMessage from "@/components/ui/StateMessage";
import { useEmployeeNames } from "@/lib/useEmployeeNames";
import type { EditorialArticle } from "@/lib/types";

type LoadState = "loading" | "loaded" | "unreachable" | "error";

const STATUSES = ["DRAFT", "SCHEDULED", "PUBLISHED", "HIDDEN", "ARCHIVED"];

function statusTone(status: string): "gold" | "green" | "neutral" | "red" {
  if (status === "PUBLISHED") return "green";
  if (status === "SCHEDULED") return "gold";
  if (status === "ARCHIVED") return "red";
  return "neutral";
}

const ARTICLE_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Entwurf",
  SCHEDULED: "Geplant",
  PUBLISHED: "Veröffentlicht",
  HIDDEN: "Versteckt",
  ARCHIVED: "Archiviert",
};
function articleStatusLabel(status: string): string {
  return ARTICLE_STATUS_LABEL[status] ?? status;
}

function formatDateTime(value: unknown): string {
  if (value === null || value === undefined || value === "") return "–";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return `${date.toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" })} · ${date.toLocaleTimeString("de-DE", {
    timeZone: "Europe/Berlin",
    hour: "2-digit",
    minute: "2-digit",
  })} Uhr`;
}

const inputClass =
  "rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-900 focus:border-phoenix-gold focus:outline-none focus:ring-1 focus:ring-phoenix-gold";

export default function NewsListClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = searchParams.get("status") ?? "";
  const category = searchParams.get("category") ?? "";

  const [articles, setArticles] = useState<EditorialArticle[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const { employeeName } = useEmployeeNames();

  const load = useCallback(async () => {
    setState("loading");
    try {
      const res = await fetch(`/api/news${status ? `?status=${status}` : ""}`);
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
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  function updateStatus(value: string) {
    const qs = new URLSearchParams(searchParams.toString());
    if (value) qs.set("status", value);
    else qs.delete("status");
    router.replace(`/content/news${qs.toString() ? `?${qs.toString()}` : ""}`);
  }

  function updateCategory(value: string) {
    const qs = new URLSearchParams(searchParams.toString());
    if (value) qs.set("category", value);
    else qs.delete("category");
    router.replace(`/content/news${qs.toString() ? `?${qs.toString()}` : ""}`);
  }

  const categories = Array.from(new Set(articles.map((a) => a.category).filter(Boolean))).sort();
  const visibleArticles = category ? articles.filter((a) => a.category === category) : articles;

  const columns: Column<EditorialArticle>[] = [
    {
      header: "Titel",
      cell: (a) => (
        <Link href={`/content/news/${a.id}`} className="text-phoenix-gold-dark hover:underline">
          {a.title}
        </Link>
      ),
    },
    { header: "Kategorie", cell: (a) => a.category },
    { header: "Status", cell: (a) => <Badge tone={statusTone(a.status)}>{articleStatusLabel(a.status)}</Badge> },
    { header: "Autor", cell: (a) => employeeName(a.author_employee_id) },
    { header: "Homepage", info: "Wird auf der Startseite der App besonders hervorgehoben.", cell: (a) => (a.homepage_feature ? <Badge tone="gold">Feature</Badge> : "–") },
    { header: "Breaking", info: "Als Eilmeldung markiert — wird besonders auffällig angezeigt.", cell: (a) => (a.breaking ? <Badge tone="red">Breaking</Badge> : "–") },
    { header: "Erstellt", cell: (a) => formatDateTime(a.created_at) },
    { header: "Veröffentlicht", cell: (a) => formatDateTime(a.published_at) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="flex items-center gap-1.5 text-xl font-semibold text-neutral-900">
            News
            <InfoTooltip text="Eigene, selbst geschriebene PHÖNIX-Artikel — getrennt von den automatisch importierten News anderer Anbieter." />
          </h1>
          <p className="text-sm text-neutral-400">Manuell verfasste PHÖNIX-Artikel (getrennt vom importierten News-Feed).</p>
        </div>
        <Link href="/content/news/new">
          <Button>Neuer Artikel</Button>
        </Link>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="status-filter" className="mb-1 block text-xs font-medium text-neutral-600">
            Status
          </label>
          <select id="status-filter" value={status} onChange={(e) => updateStatus(e.target.value)} className={inputClass}>
            <option value="">Alle</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {articleStatusLabel(s)}
              </option>
            ))}
          </select>
        </div>
        {categories.length > 0 && (
          <div>
            <label htmlFor="category-filter" className="mb-1 block text-xs font-medium text-neutral-600">
              Kategorie
            </label>
            <select id="category-filter" value={category} onChange={(e) => updateCategory(e.target.value)} className={inputClass}>
              <option value="">Alle</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <Card>
        {state === "loading" && <LoadingState />}
        {state === "unreachable" && (
          <StateMessage
            title="PHÖNIX Backend nicht erreichbar"
            description="Die Verbindung zum Backend konnte nicht hergestellt werden."
            onRetry={load}
          />
        )}
        {state === "error" && (
          <StateMessage title="Artikel konnten nicht geladen werden" description="Ein unerwarteter Fehler ist aufgetreten." onRetry={load} />
        )}
        {state === "loaded" && (
          <DataTable columns={columns} rows={visibleArticles} rowKey={(a) => String(a.id)} emptyMessage="Noch keine Artikel" />
        )}
      </Card>
    </div>
  );
}
