"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import DataTable, { Column } from "@/components/ui/DataTable";
import InfoTooltip from "@/components/ui/InfoTooltip";
import JsonViewer from "@/components/ui/JsonViewer";
import KeyValueList from "@/components/ui/KeyValueList";
import LoadingState from "@/components/ui/LoadingState";
import Modal from "@/components/ui/Modal";
import StateMessage from "@/components/ui/StateMessage";
import { runStatusLabel, triggerLabel } from "@/lib/presentation";
import type { JobRow, JobsPayload } from "@/lib/types";

type LoadState = "loading" | "loaded" | "unreachable" | "error";
type JobKind = "dailyPipeline" | "settlement" | "learningRuns";

function statusTone(status: string): "green" | "red" | "gold" | "neutral" {
  if (status === "completed") return "green";
  if (status === "failed") return "red";
  if (status === "running") return "gold";
  return "neutral";
}

const JOB_STATUS_LABEL: Record<string, string> = {
  completed: "Fertig",
  running: "Läuft",
  failed: "Fehlgeschlagen",
  pending: "Wartet",
};
function jobStatusLabel(status: string): string {
  return JOB_STATUS_LABEL[status] ?? runStatusLabel(status);
}

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

// Section 26 (AN2): "Dauer" - aus started_at/created_at + completed_at
// berechnet, es gibt keine eigene Dauer-Spalte in den Job-Tabellen.
function formatDuration(row: JobRow): string {
  const startRaw = row.started_at ?? row.created_at;
  if (!startRaw) return "–";
  const start = new Date(String(startRaw));
  if (Number.isNaN(start.getTime())) return "–";
  if (!row.completed_at) return row.status === "running" ? "Läuft noch" : "–";
  const end = new Date(String(row.completed_at));
  if (Number.isNaN(end.getTime())) return "–";
  const seconds = Math.max(0, Math.round((end.getTime() - start.getTime()) / 1000));
  if (seconds < 60) return `${seconds} Sek.`;
  const minutes = Math.floor(seconds / 60);
  const remSeconds = seconds % 60;
  if (minutes < 60) return `${minutes} Min. ${remSeconds} Sek.`;
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  return `${hours} Std. ${remMinutes} Min.`;
}

// Felder, die schon eine eigene Spalte/Zeile in der Detailansicht haben -
// der Rest landet automatisch im "Weitere Rohdaten"-Aufklapper, damit kein
// Feld verloren geht, ohne dass jedes einzeln gepflegt werden muss.
const HANDLED_KEYS = new Set([
  "id",
  "status",
  "created_at",
  "started_at",
  "completed_at",
  "error",
  "last_error",
]);

function KnownFieldsList({ row }: { row: JobRow }) {
  const known = Object.fromEntries(
    Object.entries(row).filter(([k]) => !HANDLED_KEYS.has(k) && typeof row[k] !== "object")
  );
  const extra = Object.fromEntries(
    Object.entries(row).filter(([k]) => !HANDLED_KEYS.has(k) && typeof row[k] === "object" && row[k] !== null)
  );
  return (
    <div className="space-y-3">
      <KeyValueList data={known} />
      {Object.keys(extra).length > 0 && <JsonViewer value={extra} label="Weitere Rohdaten" />}
    </div>
  );
}

function retryHint(kind: JobKind) {
  if (kind === "dailyPipeline") {
    return (
      <p className="text-xs text-neutral-400">
        Automatischer Cron-Job — kein manueller Neustart über das Control Center verfügbar.
      </p>
    );
  }
  if (kind === "settlement") {
    return (
      <Link href="/football/settlement" className="text-xs text-phoenix-gold-dark hover:underline">
        Erneut versuchen → Settlement-Seite
      </Link>
    );
  }
  return (
    <Link href="/model-lab/learning" className="text-xs text-phoenix-gold-dark hover:underline">
      Erneut versuchen → Learning-Seite
    </Link>
  );
}

function JobSection({
  title,
  kind,
  rows,
  columns,
}: {
  title: string;
  kind: JobKind;
  rows: JobRow[];
  columns: Column<JobRow>[];
}) {
  const [onlyFailed, setOnlyFailed] = useState(false);
  const [detail, setDetail] = useState<JobRow | null>(null);
  const visible = onlyFailed ? rows.filter((r) => r.status === "failed") : rows;

  const fullColumns: Column<JobRow>[] = [
    ...columns,
    {
      header: "Details",
      cell: (j) => (
        <Button variant="secondary" onClick={() => setDetail(j)}>
          Details
        </Button>
      ),
    },
  ];

  return (
    <Card
      title={title}
      action={
        <label className="flex items-center gap-1.5 text-xs text-neutral-500">
          <input type="checkbox" checked={onlyFailed} onChange={(e) => setOnlyFailed(e.target.checked)} />
          Nur Fehlgeschlagene
        </label>
      }
    >
      <DataTable columns={fullColumns} rows={visible} rowKey={(j) => String(j.id)} emptyMessage="Noch keine Läufe" />
      {detail && (
        <Modal title={`Job #${detail.id}`} onClose={() => setDetail(null)}>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge tone={statusTone(detail.status)}>{jobStatusLabel(detail.status)}</Badge>
              <span className="text-xs text-neutral-400">Dauer: {formatDuration(detail)}</span>
            </div>
            <KnownFieldsList row={detail} />
            {(detail.error || detail.last_error) && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
                {String(detail.error ?? detail.last_error)}
              </p>
            )}
            {detail.status === "failed" && retryHint(kind)}
          </div>
        </Modal>
      )}
    </Card>
  );
}

export default function JobsClient() {
  const [jobs, setJobs] = useState<JobsPayload | null>(null);
  const [state, setState] = useState<LoadState>("loading");

  const load = useCallback(async () => {
    setState("loading");
    try {
      const res = await fetch("/api/jobs");
      if (res.status === 502) {
        setState("unreachable");
        return;
      }
      if (!res.ok) {
        setState("error");
        return;
      }
      const data = await res.json().catch(() => null);
      setJobs(data);
      setState("loaded");
    } catch {
      setState("unreachable");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const dailyPipelineColumns: Column<JobRow>[] = [
    { header: "ID", cell: (j) => <span className="font-medium text-neutral-900">#{j.id}</span> },
    { header: "Status", cell: (j) => <Badge tone={statusTone(j.status)}>{jobStatusLabel(j.status)}</Badge> },
    { header: "Datum", cell: (j) => fmt(j.scan_date) },
    {
      header: "Verarbeitet / Veröffentlicht",
      info: "Anzahl bereits bearbeiteter Datensätze / davon in der App sichtbar gemacht.",
      cell: (j) => `${fmt(j.processed)} / ${fmt(j.published)}`,
    },
    { header: "Gestartet", cell: (j) => formatDateTime(j.created_at) },
    { header: "Dauer", cell: (j) => formatDuration(j) },
  ];

  const settlementColumns: Column<JobRow>[] = [
    { header: "ID", cell: (j) => <span className="font-medium text-neutral-900">#{j.id}</span> },
    { header: "Status", cell: (j) => <Badge tone={statusTone(j.status)}>{jobStatusLabel(j.status)}</Badge> },
    {
      header: "Fortschritt",
      info: "geprüft = angeschaut, abgerechnet = Tipp-Ergebnis final gebucht, offen = noch nicht dran, fehlgeschlagen = ging schief.",
      cell: (j) => `${fmt(j.checked)} geprüft · ${fmt(j.settled)} abgerechnet · ${fmt(j.pending)} offen · ${fmt(j.failed)} fehlgeschlagen`,
    },
    { header: "Gestartet", cell: (j) => formatDateTime(j.created_at) },
    { header: "Dauer", cell: (j) => formatDuration(j) },
  ];

  const learningRunColumns: Column<JobRow>[] = [
    { header: "ID", cell: (j) => <span className="font-medium text-neutral-900">#{j.id}</span> },
    { header: "Status", cell: (j) => <Badge tone={statusTone(j.status)}>{jobStatusLabel(j.status)}</Badge> },
    {
      header: "Auslöser",
      cell: (j) => triggerLabel(j.trigger_type),
    },
    {
      header: "Ligen / Märkte / Challenger",
      info: "Anzahl bearbeiteter Ligen / bearbeiteter Wett-Kategorien / neu erstellter Herausforderer-Modelle.",
      cell: (j) => `${fmt(j.leagues_processed)} / ${fmt(j.markets_processed)} / ${fmt(j.challengers_created)}`,
    },
    { header: "Gestartet", cell: (j) => formatDateTime(j.started_at) },
    { header: "Dauer", cell: (j) => formatDuration(j) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-1.5 text-xl font-semibold text-neutral-900">
          Jobs
          <InfoTooltip text="Automatische Hintergrund-Aufgaben, die PHÖNIX regelmäßig selbst ausführt (z.B. Spieldaten holen, Ergebnisse abrechnen)." />
        </h1>
        <p className="text-sm text-neutral-400">
          Letzte Läufe je Job-Typ: Daily-Pipeline (täglicher Football-Datenabruf, nur per Cron gestartet),
          Ergebnis-Settlement (Tipp-Abrechnung), Model-Lab-Learning (Lernvorgang der Vorhersage-Modelle). &quot;Wer
          gestartet hat&quot; wird für Pipeline/Settlement aktuell nicht erfasst (beide laufen über denselben
          technischen Weg, egal ob per Cron oder manuell ausgelöst).
        </p>
      </div>

      {state === "loading" && <LoadingState />}
      {state === "unreachable" && (
        <StateMessage
          title="PHÖNIX Backend nicht erreichbar"
          description="Die Verbindung zum Backend konnte nicht hergestellt werden."
          onRetry={load}
        />
      )}
      {state === "error" && (
        <StateMessage title="Jobs konnten nicht geladen werden" description="Beim Laden der Daten ist ein Fehler aufgetreten." onRetry={load} />
      )}

      {state === "loaded" && jobs && (
        <>
          <JobSection title="Daily Pipeline (Football-Scan)" kind="dailyPipeline" rows={jobs.dailyPipeline ?? []} columns={dailyPipelineColumns} />
          <JobSection title="Ergebnis-Settlement" kind="settlement" rows={jobs.settlement ?? []} columns={settlementColumns} />
          <JobSection title="Model-Lab Learning" kind="learningRuns" rows={jobs.learningRuns ?? []} columns={learningRunColumns} />
        </>
      )}
    </div>
  );
}
