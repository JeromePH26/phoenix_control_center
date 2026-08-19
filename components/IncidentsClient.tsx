"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import DataTable, { Column } from "@/components/ui/DataTable";
import InfoTooltip from "@/components/ui/InfoTooltip";
import Modal from "@/components/ui/Modal";
import StateMessage from "@/components/ui/StateMessage";
import type { Incident } from "@/lib/types";

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

export default function IncidentsClient() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [state, setState] = useState<LoadState>("loading");

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
    { header: "Betroffene Systeme", cell: (i) => fmt(i.affected_systems) },
    { header: "Beginn", cell: (i) => fmt(i.started_at) },
    { header: "Ende", cell: (i) => fmt(i.ended_at) },
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
            Größere Störungen: Beginn, Ende, Maßnahmen, Postmortem (kurzer Rückblick: was ist passiert und was lernen wir daraus).
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>Neuer Incident</Button>
      </div>

      <Card>
        {state === "loading" && <p className="py-8 text-center text-sm text-neutral-400">Wird geladen…</p>}
        {state === "unreachable" && (
          <StateMessage title="PHÖNIX Backend nicht erreichbar" description="Die Verbindung zum Backend konnte nicht hergestellt werden." />
        )}
        {state === "error" && (
          <StateMessage title="Incidents konnten nicht geladen werden" description="Ein unerwarteter Fehler ist aufgetreten." />
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
            <div className="grid grid-cols-2 gap-3">
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
            </div>
            <div>
              <label className={labelClass}>Maßnahmen (was wurde unternommen, um das Problem zu lösen)</label>
              <textarea rows={3} className={inputClass} value={editing.actions_taken ?? ""} onChange={(e) => setEditing({ ...editing, actions_taken: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>Postmortem (Rückblick: Ursache und Lehren für die Zukunft)</label>
              <textarea rows={3} className={inputClass} value={editing.postmortem ?? ""} onChange={(e) => setEditing({ ...editing, postmortem: e.target.value })} />
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
        </Modal>
      )}
    </div>
  );
}
