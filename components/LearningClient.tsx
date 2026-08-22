"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import DataTable, { Column } from "@/components/ui/DataTable";
import InfoTooltip from "@/components/ui/InfoTooltip";
import KeyValueList from "@/components/ui/KeyValueList";
import LoadingState from "@/components/ui/LoadingState";
import StateMessage from "@/components/ui/StateMessage";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useLeagueNames } from "@/lib/useLeagueNames";
import type { EligibilityAudit, LearningRun, ModelLabOverview } from "@/lib/types";

type LoadState = "loading" | "loaded" | "unreachable" | "error";

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

function fmt(value: unknown): string {
  if (value === null || value === undefined || value === "") return "–";
  return String(value);
}

function formatDateTime(value: unknown): string {
  if (value === null || value === undefined || value === "") return "–";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return `${date.toLocaleDateString("de-DE")} · ${date.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  })} Uhr`;
}

// Section 14 (AN2): "Dauer" - aus started_at/completed_at berechnet, es gibt
// keine eigene Dauer-Spalte im Backend.
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

export default function LearningClient() {
  const [overview, setOverview] = useState<ModelLabOverview | null>(null);
  const [audit, setAudit] = useState<EligibilityAudit | null>(null);
  const [runs, setRuns] = useState<LearningRun[]>([]);
  const [state, setState] = useState<LoadState>("loading");

  const [confirmStart, setConfirmStart] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { leagueName } = useLeagueNames();

  const load = useCallback(async () => {
    setState("loading");
    try {
      const [overviewRes, auditRes, runsRes] = await Promise.all([
        fetch("/api/model-lab/overview"),
        fetch("/api/model-lab/dry-run"),
        fetch("/api/model-lab/learning-runs?limit=5"),
      ]);
      if (overviewRes.status === 502) {
        setState("unreachable");
        return;
      }
      if (!overviewRes.ok) {
        setState("error");
        return;
      }
      setOverview(await overviewRes.json().catch(() => null));
      if (auditRes.ok) setAudit(await auditRes.json().catch(() => null));
      if (runsRes.ok) {
        const data = await runsRes.json().catch(() => null);
        setRuns(Array.isArray(data?.runs) ? data.runs : []);
      }
      setState("loaded");
    } catch {
      setState("unreachable");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleStart() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/model-lab/learning-runs", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? `Fehler (Status ${res.status}).`);
        return;
      }
      setConfirmStart(false);
      load();
    } catch {
      setError("Verbindung zum Backend fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  const runColumns: Column<LearningRun>[] = [
    { header: "ID", cell: (r) => <span className="font-medium text-neutral-900">#{r.id}</span> },
    { header: "Status", cell: (r) => <Badge tone={statusTone(r.status)}>{runStatusLabel(r.status)}</Badge> },
    {
      header: "Auslöser",
      cell: (r) =>
        r.trigger_type === "manual"
          ? "Manuell gestartet"
          : r.trigger_type === "scheduled"
            ? "Automatisch nach Zeitplan"
            : fmt(r.trigger_type),
    },
    { header: "Ligen / Märkte", cell: (r) => `${fmt(r.leagues_processed)} / ${fmt(r.markets_processed)}` },
    { header: "Challenger erstellt", cell: (r) => fmt(r.challengers_created) },
    { header: "Gestartet", cell: (r) => formatDateTime(r.started_at) },
    { header: "Dauer", cell: (r) => formatDuration(r.started_at, r.completed_at, r.status) },
  ];

  const perLeagueColumns: Column<EligibilityAudit["perLeague"][number]>[] = [
    { header: "Liga", cell: (l) => leagueName(l.leagueId) },
    { header: "Gespeichert", info: "Anzahl der für diese Liga gespeicherten Spiel-Datensätze.", cell: (l) => l.storedSnapshots },
    { header: "Freigegeben", info: "Anzahl der Spiele in dieser Liga, die auf der Whitelist stehen (manuell freigegeben).", cell: (l) => l.whitelisted },
    { header: "Abgerechnet", info: "Anzahl der Spiele in dieser Liga, für die schon ein Endergebnis eingetragen wurde.", cell: (l) => l.settled },
    { header: "Lernfähig", info: "Anzahl der Spiele in dieser Liga, die aktuell zum Lernen genutzt werden können.", cell: (l) => l.eligible },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-1.5 text-xl font-semibold text-neutral-900">
          Learning
          <InfoTooltip text="Der Bereich, in dem PHÖNIX aus vergangenen Spielen automatisch lernt und seine Vorhersage-Modelle verbessert. Rein statistisch, keine künstliche Intelligenz wie ChatGPT o.ä." />
        </h1>
        <p className="text-sm text-neutral-400">Statistisches Modell-Learning — keine generative KI (Section 56/97).</p>
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
        <StateMessage
          title="Learning-Status konnte nicht geladen werden"
          description="Ein unerwarteter Fehler ist aufgetreten."
          onRetry={load}
        />
      )}

      {state === "loaded" && overview && (
        <>
          <Card
            title="Status"
            action={
              <div className="flex gap-1.5">
                <Badge tone="green">Generative KI: {overview.generativeAi === "OFF" || !overview.generativeAi ? "Aus" : "An"}</Badge>
                <Badge tone={overview.promotionEnabled ? "gold" : "neutral"}>
                  Automatische Beförderung: {overview.promotionEnabled ? "aktiviert" : "deaktiviert"}
                </Badge>
              </div>
            }
          >
            <KeyValueList
              data={{
                "Whitelist-Ligen": overview.whitelistLeagues,
                "Aktive Champions": overview.activeChampions,
                "Aktive Challenger": overview.activeChallengers,
                "Shadow Predictions": overview.shadowPredictions,
                "Lernfähige Matches": overview.learningEligibleMatches,
                "Nächster Learning-Run (Berlin)": overview.nextLearningRunBerlin,
                "Nächstes Champion-Review (Berlin)": overview.nextChampionReviewBerlin,
              }}
              info={{
                "Aktive Champions": "Anzahl der Liga×Markt-Kombinationen mit einem aktuell aktiven Champion-Modell.",
                "Aktive Challenger": "Anzahl der Herausforderer-Modelle, die gerade getestet werden.",
                "Shadow Predictions": "Vorhersagen, die im Hintergrund zum Vergleich mitlaufen, aber nie als echter Tipp gezeigt werden.",
                "Lernfähige Matches": "Anzahl der Spiele, die aktuell die Kriterien erfüllen, um fürs Lernen verwendet zu werden.",
              }}
            />
          </Card>

          {audit && (
            <Card
              title={
                <span className="inline-flex items-center gap-1">
                  Eligibility-Audit (Dry-Run)
                  <InfoTooltip text="Prüft, wie viele gespeicherte Spiele aktuell die Bedingungen fürs Lernen erfüllen würden — ohne dabei wirklich etwas zu verändern." />
                </span>
              }
              action={<span className="text-xs text-neutral-400">Rein lesend</span>}
            >
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-md border border-neutral-100 bg-neutral-50 px-3 py-2.5">
                  <p className="text-xs text-neutral-500">Gespeicherte Snapshots</p>
                  <p className="mt-0.5 text-xl font-semibold text-neutral-900">{audit.totalStoredSnapshots}</p>
                </div>
                <div className="rounded-md border border-neutral-100 bg-neutral-50 px-3 py-2.5">
                  <p className="text-xs text-neutral-500">Lernfähig</p>
                  <p className="mt-0.5 text-xl font-semibold text-neutral-900">{audit.eligible}</p>
                </div>
                <div className="rounded-md border border-neutral-100 bg-neutral-50 px-3 py-2.5">
                  <p className="flex items-center gap-1 text-xs text-neutral-500">
                    Nicht lernfähig
                    <InfoTooltip text="Spiele, die (noch) nicht fürs Lernen verwendet werden können, z.B. weil das Ergebnis fehlt oder die Liga nicht freigeschaltet ist." />
                  </p>
                  <p className="mt-0.5 text-xl font-semibold text-neutral-900">{audit.notEligible}</p>
                </div>
              </div>
              {Object.keys(audit.exclusionsByReason ?? {}).length > 0 && (
                <div className="mt-4">
                  <p className="mb-1 text-xs font-medium text-neutral-600">Ausschlussgründe</p>
                  <KeyValueList data={audit.exclusionsByReason} />
                </div>
              )}
              <div className="mt-4">
                <DataTable
                  columns={perLeagueColumns}
                  rows={audit.perLeague ?? []}
                  rowKey={(l) => l.leagueId}
                  emptyMessage="Keine Liga-Daten"
                />
              </div>
            </Card>
          )}

          <Card title="Learning-Run starten" action={<span className="text-xs text-neutral-400">Gleiche Logik wie der Dienstags-Job</span>}>
            <Button onClick={() => setConfirmStart(true)}>Jetzt starten</Button>
          </Card>

          <Card title="Letzte Läufe" action={<Link href="/model-lab/learning-runs" className="text-xs text-phoenix-gold-dark hover:underline">Alle anzeigen</Link>}>
            <DataTable columns={runColumns} rows={runs} rowKey={(r) => String(r.id)} emptyMessage="Noch keine Läufe" />
          </Card>
        </>
      )}

      {confirmStart && (
        <ConfirmDialog
          title="Learning-Run starten"
          description="Startet einen manuellen Learning-Run für alle Whitelist-Ligen × Märkte (trigger_type=manual). Läuft asynchron im Hintergrund."
          confirmLabel="Starten"
          busy={busy}
          error={error}
          onConfirm={handleStart}
          onClose={() => setConfirmStart(false)}
        />
      )}
    </div>
  );
}
