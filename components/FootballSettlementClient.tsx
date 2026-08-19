"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import DataTable, { Column } from "@/components/ui/DataTable";
import KeyValueList from "@/components/ui/KeyValueList";
import StateMessage from "@/components/ui/StateMessage";
import type { SettlementJob } from "@/lib/types";

type LoadState = "loading" | "loaded" | "unreachable" | "error";

const POLL_INTERVAL_MS = 4000;

function statusTone(status: string): "green" | "red" | "gold" | "neutral" {
  if (status === "completed") return "green";
  if (status === "failed") return "red";
  if (status === "running") return "gold";
  return "neutral";
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

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const columns: Column<SettlementJob>[] = [
    { header: "ID", cell: (j) => <span className="font-medium text-neutral-900">#{j.id}</span> },
    { header: "Status", cell: (j) => <Badge tone={statusTone(j.status)}>{j.status}</Badge> },
    {
      header: "Fortschritt",
      cell: (j) => `${j.checked ?? 0} geprüft · ${j.settled ?? 0} abgerechnet · ${j.pending ?? 0} offen · ${j.failed ?? 0} fehlgeschlagen`,
    },
    { header: "Min. Std. seit Anstoß", cell: (j) => j.minHoursSinceKickoff ?? "–" },
    { header: "Batch", cell: (j) => j.batchSize ?? "–" },
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
        <h1 className="text-xl font-semibold text-neutral-900">Settlement</h1>
        <p className="text-sm text-neutral-400">
          Ergänzt Ergebnis/Status bereits eingefrorener Pre-Match-Snapshots. Keine erneute Analyse historischer Matches.
        </p>
      </div>

      <Card title="Ergebnisabdeckung">
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
          <Button onClick={handleStart} disabled={starting}>
            {starting ? "Wird gestartet…" : "Backfill starten"}
          </Button>
        </div>
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
    </div>
  );
}
