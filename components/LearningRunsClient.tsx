"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import DataTable, { Column } from "@/components/ui/DataTable";
import InfoTooltip from "@/components/ui/InfoTooltip";
import LoadingState from "@/components/ui/LoadingState";
import StateMessage from "@/components/ui/StateMessage";
import { learningRunStepLabel, runStatusLabel, triggerLabel } from "@/lib/presentation";
import type { LearningRun } from "@/lib/types";

type LoadState = "loading" | "loaded" | "unreachable" | "error";

function statusTone(status: string): "green" | "red" | "gold" | "neutral" {
  if (status === "completed") return "green";
  if (status === "failed") return "red";
  if (status === "running") return "gold";
  return "neutral";
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

function formatDuration(startedAt: unknown, completedAt: unknown, status: string): string {
  if (!startedAt) return "–";
  const start = new Date(String(startedAt));
  if (Number.isNaN(start.getTime())) return "–";
  if (!completedAt) return status === "running" ? "Läuft noch" : "–";
  const end = new Date(String(completedAt));
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

export default function LearningRunsClient() {
  const router = useRouter();
  const [runs, setRuns] = useState<LearningRun[]>([]);
  const [state, setState] = useState<LoadState>("loading");

  const load = useCallback(async () => {
    setState("loading");
    try {
      const res = await fetch("/api/model-lab/learning-runs?limit=100");
      if (res.status === 502) {
        setState("unreachable");
        return;
      }
      if (!res.ok) {
        setState("error");
        return;
      }
      const data = await res.json().catch(() => null);
      setRuns(Array.isArray(data?.runs) ? data.runs : []);
      setState("loaded");
    } catch {
      setState("unreachable");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const columns: Column<LearningRun>[] = [
    { header: "ID", cell: (r) => <span className="font-medium text-neutral-900">#{r.id}</span> },
    { header: "Status", cell: (r) => <Badge tone={statusTone(r.status)}>{runStatusLabel(r.status)}</Badge> },
    { header: "Auslöser", cell: (r) => triggerLabel(r.trigger_type) },
    { header: "Schritt", cell: (r) => learningRunStepLabel(r.current_step) },
    { header: "Ligen / Märkte", cell: (r) => `${fmt(r.leagues_processed)} / ${fmt(r.markets_processed)}` },
    {
      header: "Eligible / Excluded",
      info: "Eligible = Spiele, die fürs Lernen verwendet wurden. Excluded = Spiele, die ausgeschlossen wurden (z.B. fehlende Daten).",
      cell: (r) => `${fmt(r.eligible_matches)} / ${fmt(r.excluded_matches)}`,
    },
    { header: "Challenger erstellt", cell: (r) => fmt(r.challengers_created) },
    { header: "Gestartet", cell: (r) => formatDateTime(r.started_at) },
    { header: "Beendet", cell: (r) => formatDateTime(r.completed_at) },
    { header: "Dauer", cell: (r) => formatDuration(r.started_at, r.completed_at, r.status) },
    {
      header: "Fehler",
      info: "Anzahl der Fehler, die während dieses Laufs aufgetreten sind.",
      cell: (r) =>
        Array.isArray(r.errors) && r.errors.length > 0 ? (
          <Badge tone="red">{r.errors.length}</Badge>
        ) : (
          <span className="text-neutral-300">0</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-1.5 text-xl font-semibold text-neutral-900">
          Run History
          <InfoTooltip text="Verlauf aller bisherigen Lernvorgänge, in denen die Vorhersage-Modelle mit neuen Spieldaten trainiert wurden." />
        </h1>
        <p className="text-sm text-neutral-400">Alle Learning-Läufe, neueste zuerst.</p>
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
          <StateMessage
            title="Läufe konnten nicht geladen werden"
            description="Ein unerwarteter Fehler ist aufgetreten."
            onRetry={load}
          />
        )}
        {state === "loaded" && (
          <DataTable
            columns={columns}
            rows={runs}
            rowKey={(r) => String(r.id)}
            emptyMessage="Noch keine Läufe"
            onRowClick={(r) => router.push(`/model-lab/learning-runs/${r.id}`)}
          />
        )}
      </Card>
    </div>
  );
}
