"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import DataTable, { Column } from "@/components/ui/DataTable";
import StateMessage from "@/components/ui/StateMessage";
import type { SupportTicket } from "@/lib/types";

type LoadState = "loading" | "loaded" | "unreachable" | "error";

const STATUSES = ["NEU", "IN_BEARBEITUNG", "WARTET_AUF_NUTZER", "GELOEST", "GESCHLOSSEN"];

const TITLES: Record<string, { title: string; description: string }> = {
  bug: { title: "Bugs", description: "Als Bug kategorisierte Tickets." },
  premium: { title: "Premiumfälle", description: "Als Premium-Problem kategorisierte Tickets." },
  frage: { title: "Nutzerfragen", description: "Als Frage kategorisierte Tickets." },
  "": { title: "Tickets", description: "Alle Support-Tickets." },
};

function statusTone(status: string): "gold" | "green" | "red" | "neutral" {
  if (status === "NEU") return "gold";
  if (status === "GELOEST") return "green";
  if (status === "GESCHLOSSEN") return "neutral";
  return "neutral";
}

function priorityTone(priority: string): "red" | "gold" | "neutral" {
  if (priority === "dringend") return "red";
  if (priority === "hoch") return "gold";
  return "neutral";
}

function fmt(value: unknown): string {
  if (value === null || value === undefined || value === "") return "–";
  return String(value);
}

const inputClass =
  "rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-900 focus:border-phoenix-gold focus:outline-none focus:ring-1 focus:ring-phoenix-gold";

export default function SupportTicketsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const category = searchParams.get("category") ?? "";
  const status = searchParams.get("status") ?? "";

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [state, setState] = useState<LoadState>("loading");

  const load = useCallback(async () => {
    setState("loading");
    try {
      const qs = new URLSearchParams();
      if (category) qs.set("category", category);
      if (status) qs.set("status", status);
      const res = await fetch(`/api/support/tickets${qs.toString() ? `?${qs.toString()}` : ""}`);
      if (res.status === 502) {
        setState("unreachable");
        return;
      }
      if (!res.ok) {
        setState("error");
        return;
      }
      const data = await res.json().catch(() => null);
      setTickets(Array.isArray(data?.tickets) ? data.tickets : []);
      setState("loaded");
    } catch {
      setState("unreachable");
    }
  }, [category, status]);

  useEffect(() => {
    load();
  }, [load]);

  function updateStatus(value: string) {
    const qs = new URLSearchParams(searchParams.toString());
    if (value) qs.set("status", value);
    else qs.delete("status");
    router.replace(`/support/tickets${qs.toString() ? `?${qs.toString()}` : ""}`);
  }

  const columns: Column<SupportTicket>[] = [
    { header: "ID", cell: (t) => <span className="font-medium text-neutral-900">#{t.id}</span> },
    { header: "Betreff", cell: (t) => t.subject },
    { header: "Kategorie", cell: (t) => fmt(t.category) },
    { header: "Status", cell: (t) => <Badge tone={statusTone(t.status)}>{t.status}</Badge> },
    { header: "Priorität", cell: (t) => <Badge tone={priorityTone(t.priority)}>{t.priority}</Badge> },
    { header: "Zugewiesen", cell: (t) => fmt(t.assigned_employee_id) },
    { header: "Erstellt", cell: (t) => fmt(t.created_at) },
    { header: "Aktualisiert", cell: (t) => fmt(t.updated_at) },
  ];

  const { title, description } = TITLES[category] ?? { title: "Tickets", description: `Kategorie: ${category}` };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">{title}</h1>
        <p className="text-sm text-neutral-400">{description}</p>
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
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Card>
        {state === "loading" && <p className="py-8 text-center text-sm text-neutral-400">Wird geladen…</p>}
        {state === "unreachable" && (
          <StateMessage title="PHÖNIX Backend nicht erreichbar" description="Die Verbindung zum Backend konnte nicht hergestellt werden." />
        )}
        {state === "error" && (
          <StateMessage title="Tickets konnten nicht geladen werden" description="Ein unerwarteter Fehler ist aufgetreten." />
        )}
        {state === "loaded" && (
          <DataTable
            columns={columns}
            rows={tickets}
            rowKey={(t) => String(t.id)}
            emptyMessage="Keine Tickets gefunden"
            onRowClick={(t) => router.push(`/support/tickets/${t.id}`)}
          />
        )}
      </Card>
    </div>
  );
}
