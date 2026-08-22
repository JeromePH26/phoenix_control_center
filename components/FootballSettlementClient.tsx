"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import DataTable, { Column } from "@/components/ui/DataTable";
import InfoTooltip from "@/components/ui/InfoTooltip";
import KeyValueList from "@/components/ui/KeyValueList";
import StateMessage from "@/components/ui/StateMessage";
import ConfirmDialog from "@/components/ConfirmDialog";
import { humanizeCode } from "@/lib/presentation";
import type { SettlementJob } from "@/lib/types";

type LoadState = "loading" | "loaded" | "unreachable" | "error";

const POLL_INTERVAL_MS = 4000;

type DailyScanJob = {
  jobId: number;
  status: string;
  current_step?: string | null;
  processed?: number | null;
  published?: number | null;
  error?: string | null;
};

function berlinToday(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function statusTone(status: string): "green" | "red" | "gold" | "neutral" {
  if (status === "completed") return "green";
  if (status === "failed") return "red";
  if (status === "running") return "gold";
  return "neutral";
}

const JOB_STATUS_LABEL: Record<string, string> = {
  started: "Gestartet",
  completed: "Fertig",
  running: "Läuft",
  failed: "Fehlgeschlagen",
  pending: "Wartet",
  rate_limited: "API-Limit erreicht",
};
function jobStatusLabel(status: string): string {
  return JOB_STATUS_LABEL[status] ?? humanizeCode(status);
}

const SCAN_STEP_LABEL: Record<string, string> = {
  created: "Wartet auf Start",
  phase_one: "Spiele und Grunddaten werden geladen",
  phase_two: "Detaildaten werden analysiert",
  engine: "Wahrscheinlichkeiten werden berechnet",
  finalization: "Tipps werden veröffentlicht",
  completed: "Abgeschlossen",
};
function scanStepLabel(step: string | null | undefined): string {
  if (!step) return "Wird vorbereitet";
  return SCAN_STEP_LABEL[step] ?? humanizeCode(step);
}

export default function FootballSettlementClient() {
  const [coverage, setCoverage] = useState<Record<string, unknown> | null>(null);
  const [coverageState, setCoverageState] = useState<LoadState>("loading");

  const [jobs, setJobs] = useState<SettlementJob[]>([]);
  const [jobsState, setJobsState] = useState<LoadState>("loading");

  const [minHours, setMinHours] = useState(3);
  const [batchSize, setBatchSize] = useState(25);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [candidateCount, setCandidateCount] = useState<number | null>(null);
  const [candidateLoading, setCandidateLoading] = useState(false);
  const [scanDate, setScanDate] = useState(berlinToday);
  const [scanLimit, setScanLimit] = useState(20);
  const [scanStarting, setScanStarting] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanJob, setScanJob] = useState<DailyScanJob | null>(null);
  const [settlementDate, setSettlementDate] = useState(berlinToday);
  const [confirmTipSettlement, setConfirmTipSettlement] = useState(false);
  const [tipsSettling, setTipsSettling] = useState(false);
  const [tipSettlementError, setTipSettlementError] = useState<string | null>(null);
  const [tipSettlementResult, setTipSettlementResult] = useState<Record<string, unknown> | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isRunning = jobs.some((j) => j.status === "running");
  const scanActive = !!scanJob && !["completed", "failed"].includes(scanJob.status);

  const loadCoverage = useCallback(async () => {
    setCoverageState("loading");
    try {
      const res = await fetch("/api/football/settlement/coverage");
      if (res.status === 502) {
        setCoverageState("unreachable");
        return;
      }
      if (!res.ok) {
        setCoverageState("error");
        return;
      }
      const data = await res.json().catch(() => null);
      setCoverage(data);
      setCoverageState("loaded");
    } catch {
      setCoverageState("unreachable");
    }
  }, []);

  const loadJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/football/settlement/jobs");
      if (res.status === 502) {
        setJobsState("unreachable");
        return;
      }
      if (!res.ok) {
        setJobsState("error");
        return;
      }
      const data = await res.json().catch(() => null);
      const list: SettlementJob[] = Array.isArray(data?.jobs) ? data.jobs : [];
      setJobs(list);
      setJobsState("loaded");

      const stillRunning = list.some((j) => j.status === "running");
      if (!stillRunning && pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    } catch {
      setJobsState("unreachable");
    }
  }, []);

  useEffect(() => {
    loadCoverage();
    loadJobs();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [loadCoverage, loadJobs]);

  // Falls beim Laden bereits ein Job läuft (z.B. Seite neu geöffnet), Polling
  // fortsetzen statt nur einmalig zu laden.
  useEffect(() => {
    const hasRunning = jobs.some((j) => j.status === "running");
    if (hasRunning && !pollRef.current) {
      pollRef.current = setInterval(loadJobs, POLL_INTERVAL_MS);
    }
  }, [jobs, loadJobs]);

  // Section 11: "Vor Start Kandidatenzahl ... zeigen" - lädt neu, sobald der
  // Min-Stunden-Wert sich ändert, damit die Vorschau immer zum aktuellen
  // Formularwert passt.
  useEffect(() => {
    let cancelled = false;
    setCandidateLoading(true);
    fetch(`/api/football/settlement/candidates?minHoursSinceKickoff=${minHours}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) setCandidateCount(typeof data?.candidateCount === "number" ? data.candidateCount : null);
      })
      .catch(() => {
        if (!cancelled) setCandidateCount(null);
      })
      .finally(() => {
        if (!cancelled) setCandidateLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [minHours]);

  useEffect(() => {
    if (!scanJob || ["completed", "failed"].includes(scanJob.status)) return;
    let cancelled = false;
    const refresh = async () => {
      try {
        const res = await fetch(`/api/football/daily-scan/${scanJob.jobId}`);
        const data = await res.json().catch(() => null);
        if (!cancelled && res.ok && data) {
          setScanJob((current) => (current ? { ...current, ...data, jobId: current.jobId } : current));
        }
      } catch {
        // The action itself keeps running server-side; retain the last known status.
      }
    };
    void refresh();
    const timer = setInterval(refresh, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [scanJob?.jobId, scanJob?.status]);

  async function handleStartScan() {
    setScanStarting(true);
    setScanError(null);
    setScanJob(null);
    try {
      const res = await fetch("/api/football/daily-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: scanDate, limit: scanLimit, minimumDataQuality: 0 }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || typeof data?.jobId !== "number") {
        setScanError(data?.error ?? `Tagesscan konnte nicht gestartet werden (Status ${res.status}).`);
        return;
      }
      setScanJob({ jobId: data.jobId, status: data.status ?? "started" });
    } catch {
      setScanError("Verbindung zum Backend fehlgeschlagen.");
    } finally {
      setScanStarting(false);
    }
  }

  async function handleStart() {
    setStarting(true);
    setStartError(null);
    try {
      const res = await fetch("/api/football/settlement/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minHoursSinceKickoff: minHours, batchSize }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setStartError(data?.error ?? `Fehler (Status ${res.status}).`);
        return;
      }
      await loadJobs();
      if (!pollRef.current) {
        pollRef.current = setInterval(loadJobs, POLL_INTERVAL_MS);
      }
    } catch {
      setStartError("Verbindung zum Backend fehlgeschlagen.");
    } finally {
      setStarting(false);
    }
  }

  async function handleTipSettlement() {
    setTipsSettling(true);
    setTipSettlementError(null);
    try {
      const res = await fetch("/api/football/settlement/tips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: settlementDate }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setTipSettlementError(data?.error ?? `Abrechnung konnte nicht gestartet werden (Status ${res.status}).`);
        return;
      }
      setTipSettlementResult(data && typeof data === "object" ? data : null);
      setConfirmTipSettlement(false);
      void loadCoverage();
      void loadJobs();
    } catch {
      setTipSettlementError("Verbindung zum Backend fehlgeschlagen.");
    } finally {
      setTipsSettling(false);
    }
  }

  const columns: Column<SettlementJob>[] = [
    { header: "ID", cell: (j) => <span className="font-medium text-neutral-900">#{j.id}</span> },
    { header: "Status", cell: (j) => <Badge tone={statusTone(j.status)}>{jobStatusLabel(j.status)}</Badge> },
    {
      header: "Fortschritt",
      info: "geprüft = angeschaut, abgerechnet = Endergebnis nachgetragen, offen = noch nicht dran, fehlgeschlagen = ging schief.",
      cell: (j) => `${j.checked ?? 0} geprüft · ${j.settled ?? 0} abgerechnet · ${j.pending ?? 0} offen · ${j.failed ?? 0} fehlgeschlagen`,
    },
    { header: "Min. Std. seit Anstoß", info: "Nur Spiele, die schon mindestens so viele Stunden nach Anpfiff sind, wurden in diesem Lauf berücksichtigt.", cell: (j) => j.minHoursSinceKickoff ?? "–" },
    { header: "Batch", info: "Wie viele Spiele pro Durchlauf höchstens bearbeitet wurden.", cell: (j) => j.batchSize ?? "–" },
    { header: "Gestartet", cell: (j) => j.createdAt ?? "–" },
    { header: "Beendet", cell: (j) => j.completedAt ?? "–" },
    {
      header: "Letzter Fehler",
      cell: (j) => (j.lastError || j.error ? <span className="text-red-600">{j.lastError ?? j.error}</span> : "–"),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-1.5 text-xl font-semibold text-neutral-900">
          Football-Automation
          <InfoTooltip text="Hier steuerst du Scan, Ergebnisabgleich und die Tipp-Abrechnung manuell – ohne Railway oder technische Befehle." />
        </h1>
        <p className="text-sm text-neutral-400">
          Drei getrennte, sichere Schritte: Tages-Scan für neue Analysen, Ergebnis-Backfill für beendete Spiele und abschließend die Tipp-Abrechnung.
        </p>
      </div>

      <Card
        title="Tagesscan starten"
        action={<span className="text-xs text-neutral-400">Lädt Spiele, analysiert sie und veröffentlicht neue Tipps</span>}
      >
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1 text-xs text-neutral-500">
            Spieltag
            <input type="date" value={scanDate} onChange={(e) => setScanDate(e.target.value)} className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm text-neutral-900" />
          </label>
          <label className="flex flex-col gap-1 text-xs text-neutral-500">
            Max. Spiele
            <input type="number" min={1} max={20} value={scanLimit} onChange={(e) => setScanLimit(Math.min(20, Math.max(1, Number(e.target.value) || 1)))} className="w-28 rounded-md border border-neutral-300 px-2 py-1.5 text-sm text-neutral-900" />
          </label>
          <Button onClick={handleStartScan} disabled={scanStarting || scanActive}>
            {scanStarting ? "Wird gestartet…" : scanActive ? "Scan läuft bereits…" : "Tagesscan starten"}
          </Button>
        </div>
        <p className="mt-3 text-xs text-neutral-500">Es werden nur freigegebene Ligen verarbeitet. Der Qualitätsfilter ist bewusst deaktiviert, damit alle verfügbaren Analysen gespeichert werden.</p>
        {scanJob && (
          <div className="mt-3 rounded-md border border-neutral-100 bg-neutral-50 px-3 py-2 text-sm text-neutral-700">
            <span className="font-medium">Scan #{scanJob.jobId}: {jobStatusLabel(scanJob.status)}</span>
            <span className="ml-2 text-neutral-500">{scanStepLabel(scanJob.current_step)}</span>
            {typeof scanJob.processed === "number" && <span className="ml-2 text-neutral-500">· {scanJob.processed} verarbeitet</span>}
            {typeof scanJob.published === "number" && <span className="ml-2 text-neutral-500">· {scanJob.published} veröffentlicht</span>}
            {scanJob.error && <p className="mt-1 text-red-600">{scanJob.error}</p>}
          </div>
        )}
        {scanError && <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{scanError}</p>}
      </Card>

      <Card
        title={
          <span className="inline-flex items-center gap-1">
            Ergebnisabdeckung
            <InfoTooltip text="Zeigt, für wie viele beendete Spiele bereits ein Endergebnis vorliegt." />
          </span>
        }
      >
        {coverageState === "loading" && <p className="text-sm text-neutral-400">Wird geladen…</p>}
        {coverageState === "unreachable" && (
          <StateMessage title="PHÖNIX Backend nicht erreichbar" description="Die Verbindung zum Backend konnte nicht hergestellt werden." />
        )}
        {coverageState === "error" && (
          <StateMessage title="Abdeckung konnte nicht geladen werden" description="Ein unerwarteter Fehler ist aufgetreten." />
        )}
        {coverageState === "loaded" && <KeyValueList data={coverage} />}
      </Card>

      <Card
        title="Tipps abrechnen"
        action={<span className="text-xs text-neutral-400">Bucht Gewinn, Verlust, Push oder ungültig für bereits beendete Tipps</span>}
      >
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1 text-xs text-neutral-500">
            Spieltag
            <input type="date" value={settlementDate} onChange={(e) => setSettlementDate(e.target.value)} className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm text-neutral-900" />
          </label>
          <Button variant="secondary" onClick={() => { setConfirmTipSettlement(true); setTipSettlementError(null); }} disabled={tipsSettling}>
            Tipps dieses Tages abrechnen
          </Button>
        </div>
        <p className="mt-3 text-xs text-neutral-500">Die Abrechnung ruft frische Endstände ab und verändert nur bereits beendete Tipps. Laufende oder verschobene Spiele bleiben offen.</p>
        {tipSettlementResult && (
          <div className="mt-3"><KeyValueList data={{ "Gefundene offene Tipps": tipSettlementResult.pendingFound, Abgerechnet: tipSettlementResult.settled, Übersprungen: tipSettlementResult.skipped, "Tages-Kombis": Array.isArray(tipSettlementResult.dailyCombos) ? tipSettlementResult.dailyCombos.length : 0 }} /></div>
        )}
        {tipSettlementError && <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{tipSettlementError}</p>}
      </Card>

      <Card
        title="Ergebnis-Backfill starten"
        action={<span className="text-xs text-neutral-400">Prüft überfällige Matches und trägt Endergebnis + Status nach</span>}
      >
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1 text-xs text-neutral-500">
            Min. Stunden seit Anstoß
            <input
              type="number"
              min={0}
              max={720}
              value={minHours}
              onChange={(e) => setMinHours(Number(e.target.value))}
              className="w-32 rounded-md border border-neutral-300 px-2 py-1.5 text-sm text-neutral-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-neutral-500">
            Batch-Größe
            <input
              type="number"
              min={1}
              max={100}
              value={batchSize}
              onChange={(e) => setBatchSize(Number(e.target.value))}
              className="w-32 rounded-md border border-neutral-300 px-2 py-1.5 text-sm text-neutral-900"
            />
          </label>
          <Button onClick={handleStart} disabled={starting || isRunning}>
            {starting ? "Wird gestartet…" : isRunning ? "Läuft bereits…" : "Backfill starten"}
          </Button>
        </div>
        <p className="mt-3 text-xs text-neutral-500">
          {candidateLoading
            ? "Kandidatenzahl wird ermittelt…"
            : candidateCount == null
              ? "Kandidatenzahl konnte nicht ermittelt werden."
              : candidateCount === 0
                ? "Keine überfälligen Spiele für diese Einstellung."
                : `${candidateCount} Spiele würden geprüft (max. ${Math.min(candidateCount, batchSize)} im ersten Batch) - geschätzt ~${Math.min(candidateCount, batchSize)} Anfragen an den Datenanbieter, bevor der nächste Batch startet.`}
        </p>
        {isRunning && (
          <p className="mt-1 text-xs text-amber-600">Ein Backfill-Lauf ist bereits aktiv - ein neuer Lauf kann erst nach dessen Abschluss gestartet werden.</p>
        )}
        {startError && (
          <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
            {startError}
          </p>
        )}
      </Card>

      <Card title="Letzte Läufe">
        {jobsState === "loading" && <p className="py-8 text-center text-sm text-neutral-400">Wird geladen…</p>}
        {jobsState === "unreachable" && (
          <StateMessage title="PHÖNIX Backend nicht erreichbar" description="Die Verbindung zum Backend konnte nicht hergestellt werden." />
        )}
        {jobsState === "error" && (
          <StateMessage title="Läufe konnten nicht geladen werden" description="Ein unerwarteter Fehler ist aufgetreten." />
        )}
        {jobsState === "loaded" && (
          <DataTable columns={columns} rows={jobs} rowKey={(j) => String(j.id)} emptyMessage="Noch keine Backfill-Läufe" />
        )}
      </Card>

      {confirmTipSettlement && (
        <ConfirmDialog
          title="Tipps abrechnen"
          description={`PHÖNIX prüft alle offenen Tipps vom ${settlementDate} gegen aktuelle Endstände und bucht Gewinn, Verlust oder Push. Bereits abgerechnete Tipps bleiben unverändert.`}
          confirmLabel="Jetzt abrechnen"
          busy={tipsSettling}
          error={tipSettlementError}
          onConfirm={handleTipSettlement}
          onClose={() => setConfirmTipSettlement(false)}
        />
      )}
    </div>
  );
}
