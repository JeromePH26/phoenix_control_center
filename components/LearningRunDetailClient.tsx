"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import JsonViewer from "@/components/ui/JsonViewer";
import KeyValueList from "@/components/ui/KeyValueList";
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

      {state === "loading" && <p className="text-sm text-neutral-400">Wird geladen…</p>}
      {state === "notfound" && <StateMessage title="Run nicht gefunden" description="Für diese ID liegen keine Daten vor." />}
      {state === "unreachable" && (
        <StateMessage title="PHÖNIX Backend nicht erreichbar" description="Die Verbindung zum Backend konnte nicht hergestellt werden." />
      )}
      {state === "error" && (
        <StateMessage title="Run konnte nicht geladen werden" description="Ein unerwarteter Fehler ist aufgetreten." />
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
                Gestartet: run.started_at,
                Beendet: run.completed_at,
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
