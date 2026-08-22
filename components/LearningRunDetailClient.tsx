"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import JsonViewer from "@/components/ui/JsonViewer";
import KeyValueList from "@/components/ui/KeyValueList";
import LoadingState from "@/components/ui/LoadingState";
import StateMessage from "@/components/ui/StateMessage";
import type { LearningRun } from "@/lib/types";

type LoadState = "loading" | "loaded" | "notfound" | "unreachable" | "error";

function statusTone(status: string): "green" | "red" | "gold" | "neutral" {
  if (status === "completed") return "green";
  if (status === "failed") return "red";
  if (status === "running") return "gold";
  return "neutral";
}

const RUN_STATUS_LABEL: Record<string, string> = {
  completed: "Fertig",
  running: "Läuft",
  failed: "Fehlgeschlagen",
  pending: "Wartet",
};
function runStatusLabel(status: string): string {
  return RUN_STATUS_LABEL[status] ?? status;
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

export default function LearningRunDetailClient({ id }: { id: string }) {
  const [run, setRun] = useState<LearningRun | null>(null);
  const [state, setState] = useState<LoadState>("loading");

  const load = useCallback(async () => {
    setState("loading");
    try {
      const res = await fetch(`/api/model-lab/learning-runs/${encodeURIComponent(id)}`);
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
      setRun(await res.json().catch(() => null));
      setState("loaded");
    } catch {
      setState("unreachable");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/model-lab/learning-runs" className="text-xs text-neutral-400 hover:text-neutral-600">
          ← Zurück zur Run History
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-neutral-900">Learning-Run #{id}</h1>
      </div>

      {state === "loading" && <LoadingState />}
      {state === "notfound" && <StateMessage title="Run nicht gefunden" description="Für diese ID liegen keine Daten vor." />}
      {state === "unreachable" && (
        <StateMessage
          title="PHÖNIX Backend nicht erreichbar"
          description="Die Verbindung zum Backend konnte nicht hergestellt werden."
          onRetry={load}
        />
      )}
      {state === "error" && (
        <StateMessage
          title="Run konnte nicht geladen werden"
          description="Ein unerwarteter Fehler ist aufgetreten."
          onRetry={load}
        />
      )}

      {state === "loaded" && run && (
        <>
          <Card title="Übersicht" action={<Badge tone={statusTone(run.status)}>{runStatusLabel(run.status)}</Badge>}>
            <KeyValueList
              data={{
                Auslöser: run.trigger_type === "manual" ? "Manuell gestartet" : run.trigger_type === "scheduled" ? "Automatisch nach Zeitplan" : run.trigger_type,
                Schritt: run.current_step,
                "Ligen verarbeitet": run.leagues_processed,
                "Märkte verarbeitet": run.markets_processed,
                "Lernfähige Spiele": run.eligible_matches,
                "Ausgeschlossene Spiele": run.excluded_matches,
                "Challenger erstellt": run.challengers_created,
                Gestartet: formatDateTime(run.started_at),
                Beendet: run.completed_at ? formatDateTime(run.completed_at) : null,
                Dauer: formatDuration(run.started_at, run.completed_at, run.status),
                Fehler: Array.isArray(run.errors) ? run.errors.length : 0,
              }}
            />
          </Card>

          {run.exclusions_by_reason && Object.keys(run.exclusions_by_reason).length > 0 && (
            <Card title="Ausschlussgründe">
              <KeyValueList data={run.exclusions_by_reason} />
            </Card>
          )}

          <Card title="Details">
            <div className="flex gap-4">
              <JsonViewer value={run.summary} label="Summary" />
              <JsonViewer value={run.errors} label="Fehler" />
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
