"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import DataTable, { Column } from "@/components/ui/DataTable";
import InfoTooltip from "@/components/ui/InfoTooltip";
import LoadingState from "@/components/ui/LoadingState";
import Modal from "@/components/ui/Modal";
import StateMessage from "@/components/ui/StateMessage";
import { useEmployeeNames } from "@/lib/useEmployeeNames";
import type { AssignableEmployee, Incident, IncidentTimelineEvent } from "@/lib/types";

type LoadState = "loading" | "loaded" | "unreachable" | "error";

const SEVERITIES = ["minor", "major", "critical"];
const STATUSES = ["OPEN", "MONITORING", "RESOLVED"];

function severityTone(severity: string): "red" | "gold" | "neutral" {
  if (severity === "critical") return "red";
  if (severity === "major") return "gold";
  return "neutral";
}

function statusTone(status: string): "red" | "gold" | "green" {
  if (status === "OPEN") return "red";
  if (status === "MONITORING") return "gold";
  return "green";
}

const SEVERITY_LABEL: Record<string, string> = {
  minor: "Klein",
  major: "Groß",
  critical: "Schwerwiegend",
};
function severityLabel(severity: string): string {
  return SEVERITY_LABEL[severity] ?? severity;
}

const INCIDENT_STATUS_LABEL: Record<string, string> = {
  OPEN: "Offen",
  MONITORING: "Wird beobachtet",
  RESOLVED: "Abgeschlossen",
};
function incidentStatusLabel(status: string): string {
  return INCIDENT_STATUS_LABEL[status] ?? status;
}

const inputClass =
  "w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-900 focus:border-phoenix-gold focus:outline-none focus:ring-1 focus:ring-phoenix-gold";
const labelClass = "mb-1 block text-xs font-medium text-neutral-600";

function fmt(value: unknown): string {
  if (value === null || value === undefined || value === "") return "–";
  return String(value);
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

function IncidentTimeline({ incidentId }: { incidentId: number }) {
  const [events, setEvents] = useState<IncidentTimelineEvent[] | null>(null);
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const res = await fetch(`/api/incidents/${incidentId}/timeline`);
      if (!res.ok) {
        setState("error");
        return;
      }
      const data = await res.json().catch(() => null);
      setEvents(Array.isArray(data?.events) ? data.events : []);
      setState("loaded");
    } catch {
      setState("error");
    }
  }, [incidentId]);

  useEffect(() => {
    load();
  }, [load]);

  async function addEvent(e: FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/incidents/${incidentId}/timeline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: note.trim() }),
      });
      if (res.ok) {
        setNote("");
        load();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="mb-1 flex items-center gap-1 text-xs font-medium text-neutral-600">
        Timeline
        <InfoTooltip text="Chronologische Einzelereignisse während des Incidents, z.B. 'Ursache gefunden' oder 'Mitigation ausgerollt' - zusätzlich zu Beginn/Ende." />
      </p>
      {state === "loading" && <p className="text-sm text-neutral-400">Wird geladen…</p>}
      {state === "error" && <p className="text-sm text-neutral-400">Timeline konnte nicht geladen werden.</p>}
      {state === "loaded" && events && (
        <ul className="space-y-1.5">
          {events.length === 0 && <li className="text-sm text-neutral-400">Noch keine Einträge.</li>}
          {events.map((ev) => (
            <li key={ev.id} className="flex items-start justify-between gap-3 border-b border-neutral-100 pb-1.5 text-sm last:border-0">
              <span className="text-neutral-800">{ev.note}</span>
              <span className="whitespace-nowrap text-xs text-neutral-400">
                {formatDateTime(ev.occurred_at)}
                {ev.created_by_employee_name ? ` · ${ev.created_by_employee_name}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={addEvent} className="mt-2 flex gap-2">
        <input
          className={inputClass}
          placeholder="Neuer Timeline-Eintrag…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <Button type="submit" variant="secondary" disabled={busy || !note.trim()}>
          {busy ? "…" : "Hinzufügen"}
        </Button>
      </form>
    </div>
  );
}

export default function IncidentsClient() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [employees, setEmployees] = useState<AssignableEmployee[]>([]);
  const { employeeName } = useEmployeeNames();

  const [creating, setCreating] = useState(false);
  const [newIncident, setNewIncident] = useState({ title: "", severity: "minor", affectedSystems: "" });
  const [editing, setEditing] = useState<Incident | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const res = await fetch("/api/incidents");
      if (res.status === 502) {
        setState("unreachable");
        return;
      }
      if (!res.ok) {
        setState("error");
        return;
      }
      const data = await res.json().catch(() => null);
      setIncidents(Array.isArray(data?.incidents) ? data.incidents : []);
      setState("loaded");
    } catch {
      setState("unreachable");
    }
  }, []);

  useEffect(() => {
    load();
    fetch("/api/support/assignable-employees")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setEmployees(Array.isArray(data?.employees) ? data.employees : []))
      .catch(() => {});
  }, [load]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!newIncident.title.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newIncident),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? `Fehler (Status ${res.status}).`);
        return;
      }
      setCreating(false);
      setNewIncident({ title: "", severity: "minor", affectedSystems: "" });
      load();
    } catch {
      setError("Verbindung zum Backend fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdate(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/incidents/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: editing.status,
          severity: editing.severity,
          actionsTaken: editing.actions_taken,
          postmortem: editing.postmortem,
          responsibleEmployeeId: editing.responsible_employee_id ?? undefined,
          impactDescription: editing.impact_description,
          relatedJobsNote: editing.related_jobs_note,
          communicationNote: editing.communication_note,
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

  const columns: Column<Incident>[] = [
    {
      header: "Titel",
      cell: (i) => (
        <button className="text-left text-phoenix-gold-dark hover:underline" onClick={() => { setEditing(i); setError(null); }}>
          {i.title}
        </button>
      ),
    },
    { header: "Schwere", info: "Wie stark die Störung Nutzer betroffen hat.", cell: (i) => <Badge tone={severityTone(i.severity)}>{severityLabel(i.severity)}</Badge> },
    { header: "Status", cell: (i) => <Badge tone={statusTone(i.status)}>{incidentStatusLabel(i.status)}</Badge> },
    { header: "Verantwortlicher", cell: (i) => employeeName(i.responsible_employee_id) },
    { header: "Betroffene Systeme", cell: (i) => fmt(i.affected_systems) },
    { header: "Beginn", cell: (i) => formatDateTime(i.started_at) },
    { header: "Ende", cell: (i) => formatDateTime(i.ended_at) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="flex items-center gap-1.5 text-xl font-semibold text-neutral-900">
            Incidents
            <InfoTooltip text="Größere Störungen im System werden hier dokumentiert: was war kaputt, wie lange, was wurde dagegen getan." />
          </h1>
          <p className="text-sm text-neutral-400">
            Größere Störungen: Beginn, Ende, Auswirkungen, Timeline, Maßnahmen, Postmortem (kurzer Rückblick: was ist
            passiert und was lernen wir daraus).
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>Neuer Incident</Button>
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
          <StateMessage title="Incidents konnten nicht geladen werden" description="Ein unerwarteter Fehler ist aufgetreten." onRetry={load} />
        )}
        {state === "loaded" && (
          <DataTable columns={columns} rows={incidents} rowKey={(i) => String(i.id)} emptyMessage="Keine Incidents" />
        )}
      </Card>

      {creating && (
        <Modal title="Neuer Incident" onClose={() => setCreating(false)}>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className={labelClass}>Titel</label>
              <input className={inputClass} value={newIncident.title} onChange={(e) => setNewIncident({ ...newIncident, title: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Schwere</label>
                <select className={inputClass} value={newIncident.severity} onChange={(e) => setNewIncident({ ...newIncident, severity: e.target.value })}>
                  {SEVERITIES.map((s) => (
                    <option key={s} value={s}>
                      {severityLabel(s)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Betroffene Systeme</label>
                <input
                  className={inputClass}
                  value={newIncident.affectedSystems}
                  onChange={(e) => setNewIncident({ ...newIncident, affectedSystems: e.target.value })}
                />
              </div>
            </div>
            {error && (
              <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setCreating(false)}>
                Abbrechen
              </Button>
              <Button type="submit" disabled={busy || !newIncident.title.trim()}>
                {busy ? "…" : "Erstellen"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {editing && (
        <Modal title={editing.title} onClose={() => setEditing(null)}>
          <form onSubmit={handleUpdate} className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>Status</label>
                <select className={inputClass} value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value })}>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {incidentStatusLabel(s)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Schwere</label>
                <select className={inputClass} value={editing.severity} onChange={(e) => setEditing({ ...editing, severity: e.target.value })}>
                  {SEVERITIES.map((s) => (
                    <option key={s} value={s}>
                      {severityLabel(s)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Verantwortlicher</label>
                <select
                  className={inputClass}
                  value={editing.responsible_employee_id ?? ""}
                  onChange={(e) => setEditing({ ...editing, responsible_employee_id: e.target.value ? Number(e.target.value) : null })}
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
            <div>
              <label className="mb-1 flex items-center gap-1 text-xs font-medium text-neutral-600">
                Auswirkungen
                <InfoTooltip text="Was Nutzer konkret gemerkt haben, z.B. 'Keine Tipps für 45 Minuten sichtbar' - getrennt von 'Betroffene Systeme' (dem technischen Bauteil)." />
              </label>
              <textarea rows={2} className={inputClass} value={editing.impact_description ?? ""} onChange={(e) => setEditing({ ...editing, impact_description: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>Maßnahmen (was wurde unternommen, um das Problem zu lösen)</label>
              <textarea rows={3} className={inputClass} value={editing.actions_taken ?? ""} onChange={(e) => setEditing({ ...editing, actions_taken: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>Postmortem (Rückblick: Ursache und Lehren für die Zukunft)</label>
              <textarea rows={3} className={inputClass} value={editing.postmortem ?? ""} onChange={(e) => setEditing({ ...editing, postmortem: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 flex items-center gap-1 text-xs font-medium text-neutral-600">
                  Verknüpfte Jobs / API-Ausfälle
                  <InfoTooltip text="Freitext-Verweis, z.B. 'Settlement Job #128' oder 'API-Football Fehlerquote 40% ab 14:10' - kein anklickbarer Link, da Jobs auf mehrere Tabellen ohne gemeinsames Schema verteilt sind." />
                </label>
                <textarea rows={2} className={inputClass} value={editing.related_jobs_note ?? ""} onChange={(e) => setEditing({ ...editing, related_jobs_note: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 flex items-center gap-1 text-xs font-medium text-neutral-600">
                  Nutzerkommunikation
                  <InfoTooltip text="Was Nutzern mitgeteilt wurde und wann, z.B. 'Push-Nachricht #12 um 14:20 gesendet' oder 'App-Status auf Wartung gesetzt'." />
                </label>
                <textarea rows={2} className={inputClass} value={editing.communication_note ?? ""} onChange={(e) => setEditing({ ...editing, communication_note: e.target.value })} />
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
              <Button type="submit" disabled={busy}>
                {busy ? "…" : "Speichern"}
              </Button>
            </div>
          </form>

          <div className="mt-4 border-t border-neutral-100 pt-4">
            <IncidentTimeline incidentId={editing.id} />
          </div>
        </Modal>
      )}
    </div>
  );
}
