"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import DataTable, { Column } from "@/components/ui/DataTable";
import InfoTooltip from "@/components/ui/InfoTooltip";
import KeyValueList from "@/components/ui/KeyValueList";
import StateMessage from "@/components/ui/StateMessage";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useLeagueNames } from "@/lib/useLeagueNames";
import type { ShadowComparisonToChampion, ShadowPrediction, ShadowStatus } from "@/lib/types";

type BatchAction = "generate" | "settle" | null;

interface PerformanceResult {
  modelVersionId: number;
  settledShadowPredictions: number;
  averageBrierScore: number | null;
  accuracy: number | null;
  comparisonToChampion: ShadowComparisonToChampion | null;
  predictions: ShadowPrediction[];
}

function fmt(value: unknown): string {
  if (value === null || value === undefined || value === "") return "–";
  return String(value);
}

// Section 15 (AN2): "Signifikanz" in Klartext statt als rohes status-Enum.
const COMPARISON_LABEL: Record<string, string> = {
  challengerClearlyBetter: "Herausforderer statistisch klar besser",
  approximatelyEqual: "Kein statistisch eindeutiger Unterschied",
  championBetter: "Champion statistisch besser",
  notEnoughData: "Statistische Unsicherheit zu groß",
};
function comparisonLabel(status: string): string {
  return COMPARISON_LABEL[status] ?? status;
}
function comparisonTone(status: string): "green" | "gold" | "neutral" | "red" {
  if (status === "challengerClearlyBetter") return "gold";
  if (status === "championBetter") return "red";
  return "neutral";
}

function formatNumber(v: number, digits = 4): string {
  return v.toFixed(digits).replace(".", ",");
}

const inputClass =
  "w-40 rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-900 focus:border-phoenix-gold focus:outline-none focus:ring-1 focus:ring-phoenix-gold";

export default function ShadowClient() {
  const { leagueName } = useLeagueNames();
  const [status, setStatus] = useState<ShadowStatus | null>(null);
  const [batchAction, setBatchAction] = useState<BatchAction>(null);
  const [batchBusy, setBatchBusy] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [batchResult, setBatchResult] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const [modelVersionId, setModelVersionId] = useState("");
  const [perf, setPerf] = useState<PerformanceResult | null>(null);
  const [perfState, setPerfState] = useState<"idle" | "loading" | "loaded" | "error" | "unreachable">("idle");

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/model-lab/shadow/status");
      if (res.ok) setStatus(await res.json().catch(() => null));
    } catch {
      // Section 15: Status ist nur eine Vorschau - ein Fehler hier blockiert die Seite nicht.
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // Section 15 (AN2): "Laufzeit ... sichtbar machen" - generate/settle sind
  // synchrone Backend-Aufrufe ohne eigene Fortschritts-API, daher die real
  // gemessene Wanduhrzeit client-seitig als Sekunden-Zähler während der
  // laufenden Anfrage.
  useEffect(() => {
    if (!batchBusy) return;
    setElapsedSeconds(0);
    const start = Date.now();
    const interval = setInterval(() => setElapsedSeconds(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(interval);
  }, [batchBusy]);

  async function runBatchAction() {
    if (!batchAction) return;
    setBatchBusy(true);
    setBatchError(null);
    const startedAt = Date.now();
    try {
      const res = await fetch(`/api/model-lab/shadow/${batchAction}`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setBatchError(data?.error ?? `Fehler (Status ${res.status}).`);
        return;
      }
      const seconds = ((Date.now() - startedAt) / 1000).toFixed(1).replace(".", ",");
      const count = batchAction === "generate" ? data?.created : data?.settled;
      setBatchResult(
        `${batchAction === "generate" ? "Erstellt" : "Abgerechnet"}: ${count ?? "–"} (Laufzeit: ${seconds} Sek.)`
      );
      setBatchAction(null);
      loadStatus();
    } catch {
      setBatchError("Verbindung zum Backend fehlgeschlagen.");
    } finally {
      setBatchBusy(false);
    }
  }

  async function handlePerfSubmit(e: FormEvent) {
    e.preventDefault();
    const id = Number(modelVersionId);
    if (!id) return;
    setPerfState("loading");
    try {
      const res = await fetch(`/api/model-lab/shadow/performance?modelVersionId=${id}`);
      if (res.status === 502) {
        setPerfState("unreachable");
        return;
      }
      if (!res.ok) {
        setPerfState("error");
        return;
      }
      setPerf(await res.json().catch(() => null));
      setPerfState("loaded");
    } catch {
      setPerfState("unreachable");
    }
  }

  const columns: Column<ShadowPrediction>[] = [
    { header: "Fixture", cell: (p) => p.fixture_id },
    { header: "Liga", cell: (p) => (p.league_id ? leagueName(p.league_id) : "Global") },
    { header: "Markt", cell: (p) => p.market },
    { header: "Settled", cell: (p) => <Badge tone={p.settled ? "green" : "neutral"}>{p.settled ? "Ja" : "Nein"}</Badge> },
    { header: "Brier", info: "Brier Score: misst die Treffgenauigkeit der Wahrscheinlichkeiten. Niedriger = besser.", cell: (p) => fmt(p.brier_score) },
    { header: "Log Loss", info: "Ähnlich wie Brier Score, bestraft selbstsichere Fehlvorhersagen stärker. Niedriger = besser.", cell: (p) => fmt(p.log_loss) },
    { header: "Kickoff", cell: (p) => fmt(p.kickoff) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-1.5 text-xl font-semibold text-neutral-900">
          Shadow
          <InfoTooltip text="Ein Testmodell rechnet im Hintergrund mit, ohne dass Nutzer davon etwas sehen — so kann man prüfen, ob es besser wäre als das aktuelle Modell, bevor man wirklich umstellt." />
        </h1>
        <p className="text-sm text-neutral-400">
          Champion und Challenger erhalten denselben Pre-Match-Input; Shadow-Predictions dienen ausschließlich der
          Evaluation, nicht der Nutzer-Ausgabe.
        </p>
      </div>

      <Card
        title="Shadow-Predictions verwalten"
        action={<span className="text-xs text-neutral-400">Kein zusätzlicher API-Verbrauch – nutzt bereits gespeicherte Daten</span>}
      >
        <KeyValueList
          data={{
            "Ausstehend zum Abrechnen": status?.pendingSettle,
            "Gesamt Shadow-Predictions": status?.totalShadowPredictions,
          }}
          info={{
            "Ausstehend zum Abrechnen": "Shadow-Predictions, deren Spiel schon vorbei ist, aber noch nicht mit dem echten Ergebnis abgeglichen wurde.",
          }}
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            disabled={batchBusy || !!status?.actionInProgress}
            onClick={() => { setBatchAction("generate"); setBatchError(null); }}
          >
            Ausstehende generieren
          </Button>
          <Button
            variant="secondary"
            disabled={batchBusy || !!status?.actionInProgress}
            onClick={() => { setBatchAction("settle"); setBatchError(null); }}
          >
            Ausstehende abrechnen
          </Button>
          {batchBusy && <span className="text-sm text-neutral-500">Läuft seit {elapsedSeconds} Sek. …</span>}
          {!batchBusy && batchResult && <span className="text-sm text-neutral-500">{batchResult}</span>}
          {!batchBusy && batchError && <span className="text-sm text-red-600">{batchError}</span>}
        </div>
      </Card>

      <Card title="Performance ansehen">
        <form onSubmit={handlePerfSubmit} className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="model-version-id" className="mb-1 block text-xs font-medium text-neutral-600">
              Model-Version-ID
            </label>
            <input
              id="model-version-id"
              type="number"
              value={modelVersionId}
              onChange={(e) => setModelVersionId(e.target.value)}
              className={inputClass}
            />
          </div>
          <Button type="submit">Anzeigen</Button>
        </form>

        {perfState === "loading" && <p className="mt-4 text-sm text-neutral-400">Wird geladen…</p>}
        {perfState === "unreachable" && (
          <div className="mt-4">
            <StateMessage title="PHÖNIX Backend nicht erreichbar" description="Die Verbindung zum Backend konnte nicht hergestellt werden." />
          </div>
        )}
        {perfState === "error" && (
          <div className="mt-4">
            <StateMessage title="Performance konnte nicht geladen werden" description="Ungültige Model-Version-ID oder ein Fehler ist aufgetreten." />
          </div>
        )}
        {perfState === "loaded" && perf && (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="rounded-md border border-neutral-100 bg-neutral-50 px-3 py-2.5">
                <p className="text-xs text-neutral-500">Abgerechnet</p>
                <p className="mt-0.5 text-xl font-semibold text-neutral-900">{perf.settledShadowPredictions}</p>
              </div>
              <div className="rounded-md border border-neutral-100 bg-neutral-50 px-3 py-2.5">
                <p className="flex items-center gap-1 text-xs text-neutral-500">
                  Trefferquote
                  <InfoTooltip text="Anteil der Fälle, in denen die höchste vorhergesagte Wahrscheinlichkeit tatsächlich eingetroffen ist." />
                </p>
                <p className="mt-0.5 text-xl font-semibold text-neutral-900">
                  {perf.accuracy != null ? `${(perf.accuracy * 100).toFixed(1).replace(".", ",")} %` : "–"}
                </p>
              </div>
              <div className="rounded-md border border-neutral-100 bg-neutral-50 px-3 py-2.5">
                <p className="text-xs text-neutral-500">Ø Brier Score</p>
                <p className="mt-0.5 text-xl font-semibold text-neutral-900">{perf.averageBrierScore ?? "–"}</p>
              </div>
              <div className="rounded-md border border-neutral-100 bg-neutral-50 px-3 py-2.5">
                <p className="flex items-center gap-1 text-xs text-neutral-500">
                  ROI
                  <InfoTooltip text="Shadow-Predictions haben keine Marktquote (kein echter Einsatz) - ein ROI wäre erfunden. ROI ist nur für echte Tipps verfügbar." />
                </p>
                <p className="mt-0.5 text-sm text-neutral-400">Nicht verfügbar</p>
              </div>
            </div>

            <div>
              <p className="mb-1 text-xs font-medium text-neutral-600">Champion-vs-Challenger (Signifikanz)</p>
              {perf.comparisonToChampion ? (
                <div className="rounded-md border border-neutral-100 bg-neutral-50 px-3 py-2.5">
                  <Badge tone={comparisonTone(perf.comparisonToChampion.status)}>
                    {comparisonLabel(perf.comparisonToChampion.status)}
                  </Badge>
                  <p className="mt-1 text-xs text-neutral-500">
                    Gegen Champion #{perf.comparisonToChampion.championModelId}
                    {perf.comparisonToChampion.championReadableVersion ? ` (${perf.comparisonToChampion.championReadableVersion})` : ""}:
                    Δ Brier {formatNumber(perf.comparisonToChampion.meanDifference)} (95%-CI [
                    {formatNumber(perf.comparisonToChampion.lowerBound)}, {formatNumber(perf.comparisonToChampion.upperBound)}],
                    n={perf.comparisonToChampion.sampleSize} von {perf.comparisonToChampion.minPromotionSample} benötigt)
                  </p>
                </div>
              ) : (
                <p className="text-sm text-neutral-400">
                  Kein Vergleich verfügbar — entweder ist dieses Modell selbst der Champion, oder es gibt (noch) keinen
                  Champion für dieselbe Liga × Markt-Kombination.
                </p>
              )}
            </div>

            <DataTable
              columns={columns}
              rows={perf.predictions ?? []}
              rowKey={(p) => String(p.id)}
              emptyMessage="Keine abgerechneten Shadow-Predictions"
            />
          </div>
        )}
      </Card>

      {batchAction && (
        <ConfirmDialog
          title={batchAction === "generate" ? "Shadow-Predictions generieren" : "Shadow-Predictions abrechnen"}
          description={
            batchAction === "generate"
              ? "Erstellt Shadow-Predictions für alle Champion/Challenger-Kombinationen mit ausstehenden Fixtures."
              : "Rechnet alle Shadow-Predictions ab, für die inzwischen ein Ergebnis vorliegt."
          }
          confirmLabel="Ausführen"
          busy={batchBusy}
          error={batchError}
          onConfirm={runBatchAction}
          onClose={() => setBatchAction(null)}
        />
      )}
    </div>
  );
}
