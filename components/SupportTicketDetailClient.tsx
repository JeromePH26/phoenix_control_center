"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import InfoTooltip from "@/components/ui/InfoTooltip";
import KeyValueList from "@/components/ui/KeyValueList";
import StateMessage from "@/components/ui/StateMessage";
import type { AssignableEmployee, SupportTicket, SupportTicketMessage } from "@/lib/types";

type LoadState = "loading" | "loaded" | "notfound" | "unreachable" | "error";

const STATUSES = ["NEU", "IN_BEARBEITUNG", "WARTET_AUF_NUTZER", "GELOEST", "GESCHLOSSEN"];
const PRIORITIES = ["niedrig", "normal", "hoch", "dringend"];
const CATEGORIES = ["frage", "bug", "premium", "match", "sonstiges"];

const TICKET_STATUS_LABEL: Record<string, string> = {
  NEU: "Neu",
  IN_BEARBEITUNG: "In Bearbeitung",
  WARTET_AUF_NUTZER: "Wartet auf Nutzer",
  GELOEST: "Gelöst",
  GESCHLOSSEN: "Geschlossen",
};
function ticketStatusLabel(status: string): string {
  return TICKET_STATUS_LABEL[status] ?? status;
}

const PRIORITY_LABEL: Record<string, string> = {
  niedrig: "Niedrig",
  normal: "Normal",
  hoch: "Hoch",
  dringend: "Dringend",
};
function priorityLabel(priority: string): string {
  return PRIORITY_LABEL[priority] ?? priority;
}

const CATEGORY_LABEL: Record<string, string> = {
  frage: "Frage",
  bug: "Bug (Fehler)",
  premium: "Premium-Problem",
  match: "Spiel-bezogen",
  sonstiges: "Sonstiges",
};
function categoryLabel(category: string): string {
  return CATEGORY_LABEL[category] ?? category;
}

const selectClass =
  "rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-900 focus:border-phoenix-gold focus:outline-none focus:ring-1 focus:ring-phoenix-gold";

function fmt(value: unknown): string {
  if (value === null || value === undefined || value === "") return "–";
  return String(value);
}

export default function SupportTicketDetailClient({ id }: { id: string }) {
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportTicketMessage[]>([]);
  const [employees, setEmployees] = useState<AssignableEmployee[]>([]);
  const [state, setState] = useState<LoadState>("loading");

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [replyText, setReplyText] = useState("");
  const [internalNote, setInternalNote] = useState(false);
  const [replyBusy, setReplyBusy] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const [ticketRes, employeesRes] = await Promise.all([
        fetch(`/api/support/tickets/${encodeURIComponent(id)}`),
        fetch("/api/support/assignable-employees"),
      ]);
      if (ticketRes.status === 404) {
        setState("notfound");
        return;
      }
      if (ticketRes.status === 502) {
        setState("unreachable");
        return;
      }
      if (!ticketRes.ok) {
        setState("error");
        return;
      }
      const data = await ticketRes.json().catch(() => null);
      setTicket(data?.ticket ?? null);
      setMessages(Array.isArray(data?.messages) ? data.messages : []);
      if (employeesRes.ok) {
        const empData = await employeesRes.json().catch(() => null);
        setEmployees(Array.isArray(empData?.employees) ? empData.employees : []);
      }
      setState("loaded");
    } catch {
      setState("unreachable");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function patchTicket(patch: Record<string, unknown>) {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/support/tickets/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setSaveError(data?.error ?? `Fehler (Status ${res.status}).`);
        return;
      }
      const data = await res.json().catch(() => null);
      if (data?.ticket) setTicket(data.ticket);
    } catch {
      setSaveError("Verbindung zum Backend fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  }

  async function handleReplySubmit(e: FormEvent) {
    e.preventDefault();
    if (!replyText.trim()) return;
    setReplyBusy(true);
    setReplyError(null);
    try {
      const res = await fetch(`/api/support/tickets/${encodeURIComponent(id)}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: replyText.trim(), internalNote }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setReplyError(data?.error ?? `Fehler (Status ${res.status}).`);
        return;
      }
      setReplyText("");
      setInternalNote(false);
      load();
    } catch {
      setReplyError("Verbindung zum Backend fehlgeschlagen.");
    } finally {
      setReplyBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/support/tickets" className="text-xs text-neutral-400 hover:text-neutral-600">
          ← Zurück zu Tickets
        </Link>
        <h1 className="mt-1 flex items-center gap-1.5 text-xl font-semibold text-neutral-900">
          Ticket #{id}
          <InfoTooltip text="Details zur Support-Anfrage. Unten kannst du Status/Priorität ändern und dem Nutzer antworten." />
        </h1>
      </div>

      {state === "loading" && <p className="text-sm text-neutral-400">Wird geladen…</p>}
      {state === "notfound" && <StateMessage title="Ticket nicht gefunden" description="Für diese ID liegen keine Daten vor." />}
      {state === "unreachable" && (
        <StateMessage title="PHÖNIX Backend nicht erreichbar" description="Die Verbindung zum Backend konnte nicht hergestellt werden." />
      )}
      {state === "error" && (
        <StateMessage title="Ticket konnte nicht geladen werden" description="Ein unerwarteter Fehler ist aufgetreten." />
      )}

      {state === "loaded" && ticket && (
        <>
          <Card title={ticket.subject} action={<Badge tone="gold">{ticketStatusLabel(ticket.status)}</Badge>}>
            <KeyValueList
              data={{
                Nachricht: ticket.message,
                "Gerät (Installation-ID)": ticket.installation_id,
                "App-Version": ticket.app_version,
                Plattform: ticket.platform,
                "OS-Version": ticket.os_version,
                Gerätemodell: ticket.device_model,
                "PHÖNIX Match ID": ticket.match_id,
                Screen: ticket.screen,
                Erstellt: ticket.created_at,
                Aktualisiert: ticket.updated_at,
              }}
              info={{
                "Gerät (Installation-ID)": "Eindeutige, anonyme Kennung des Geräts, von dem aus das Ticket geschickt wurde (kein Nutzerkonto nötig).",
                "PHÖNIX Match ID": "Falls der Nutzer sich auf ein bestimmtes Spiel bezogen hat, dessen interne Nummer.",
                Screen: "Der Bildschirm/die Seite in der App, auf der sich der Nutzer befand, als er das Ticket geschickt hat.",
              }}
            />
          </Card>

          <Card title="Bearbeitung" action={saving ? <span className="text-xs text-neutral-400">Speichert…</span> : undefined}>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label htmlFor="ticket-status" className="mb-1 block text-xs font-medium text-neutral-600">
                  Status
                </label>
                <select
                  id="ticket-status"
                  className={selectClass}
                  value={ticket.status}
                  onChange={(e) => patchTicket({ status: e.target.value })}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {ticketStatusLabel(s)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="ticket-priority" className="mb-1 block text-xs font-medium text-neutral-600">
                  Priorität
                </label>
                <select
                  id="ticket-priority"
                  className={selectClass}
                  value={ticket.priority}
                  onChange={(e) => patchTicket({ priority: e.target.value })}
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {priorityLabel(p)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="ticket-category" className="mb-1 block text-xs font-medium text-neutral-600">
                  Kategorie
                </label>
                <select
                  id="ticket-category"
                  className={selectClass}
                  value={ticket.category}
                  onChange={(e) => patchTicket({ category: e.target.value })}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {categoryLabel(c)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="ticket-assignee" className="mb-1 block text-xs font-medium text-neutral-600">
                  Zugewiesen an
                </label>
                <select
                  id="ticket-assignee"
                  className={selectClass}
                  value={ticket.assigned_employee_id ?? ""}
                  onChange={(e) =>
                    patchTicket({ assignedEmployeeId: e.target.value ? Number(e.target.value) : null })
                  }
                >
                  <option value="">Nicht zugewiesen</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {saveError && (
              <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
                {saveError}
              </p>
            )}
          </Card>

          <Card title="Verlauf">
            <div className="space-y-3">
              {messages.length === 0 && <p className="text-sm text-neutral-400">Noch keine Nachrichten.</p>}
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`rounded-md border px-3 py-2 text-sm ${
                    m.internal_note
                      ? "border-amber-200 bg-amber-50"
                      : m.author_type === "employee"
                      ? "border-neutral-200 bg-neutral-50"
                      : "border-phoenix-gold/20 bg-phoenix-gold/5"
                  }`}
                >
                  <div className="mb-1 flex items-center gap-2 text-xs text-neutral-500">
                    <span className="font-medium">{m.author_type === "employee" ? "Mitarbeiter" : "Nutzer"}</span>
                    {m.internal_note && <Badge tone="gold">Intern</Badge>}
                    <span>{fmt(m.created_at)}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-neutral-800">{m.message}</p>
                </div>
              ))}
            </div>

            <form onSubmit={handleReplySubmit} className="mt-4 space-y-2 border-t border-neutral-100 pt-4">
              <textarea
                rows={3}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Antwort schreiben…"
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-phoenix-gold focus:outline-none focus:ring-1 focus:ring-phoenix-gold"
              />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs text-neutral-600">
                  <input type="checkbox" checked={internalNote} onChange={(e) => setInternalNote(e.target.checked)} />
                  Interne Notiz (für Nutzer nicht sichtbar)
                </label>
                <Button type="submit" disabled={replyBusy || !replyText.trim()}>
                  {replyBusy ? "…" : internalNote ? "Notiz speichern" : "Antworten"}
                </Button>
              </div>
              {replyError && (
                <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
                  {replyError}
                </p>
              )}
            </form>
          </Card>
        </>
      )}
    </div>
  );
}
