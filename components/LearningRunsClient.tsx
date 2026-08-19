"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import DataTable, { Column } from "@/components/ui/DataTable";
import InfoTooltip from "@/components/ui/InfoTooltip";
import StateMessage from "@/components/ui/StateMessage";
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
    { header: "Status", cell: (r) => <Badge tone={statusTone(r.status)}>{r.status}</Badge> },
    { header: "Auslöser", info: "manual = von Hand gestartet. scheduled = automatisch nach Zeitplan.", cell: (r) => fmt(r.trigger_type) },
    { header: "Schritt", cell: (r) => fmt(r.current_step) },
    { header: "Ligen / Märkte", cell: (r) => `${fmt(r.leagues_processed)} / ${fmt(r.markets_processed)}` },
    {
      header: "Eligible / Excluded",
      info: "Eligible = Spiele, die fürs Lernen verwendet wurden. Excluded = Spiele, die ausgeschlossen wurden (z.B. fehlende Daten).",
      cell: (r) => `${fmt(r.eligible_matches)} / ${fmt(r.excluded_matches)}`,
    },
    { header: "Challenger erstellt", cell: (r) => fmt(r.challengers_created) },
    { header: "Gestartet", cell: (r) => fmt(r.started_at) },
    { header: "Beendet", cell: (r) => fmt(r.completed_at) },
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
        {state === "loading" && <p className="py-8 text-center text-sm text-neutral-400">Wird geladen…</p>}
        {state === "unreachable" && (
          <StateMessage title="PHÖNIX Backend nicht erreichbar" description="Die Verbindung zum Backend konnte nicht hergestellt werden." />
        )}
        {state === "error" && (
          <StateMessage title="Läufe konnten nicht geladen werden" description="Ein unerwarteter Fehler ist aufgetreten." />
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
