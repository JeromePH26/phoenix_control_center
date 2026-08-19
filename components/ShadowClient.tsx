"use client";

import { FormEvent, useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import DataTable, { Column } from "@/components/ui/DataTable";
import InfoTooltip from "@/components/ui/InfoTooltip";
import StateMessage from "@/components/ui/StateMessage";
import ConfirmDialog from "@/components/ConfirmDialog";
import type { ShadowPrediction } from "@/lib/types";

type BatchAction = "generate" | "settle" | null;

interface PerformanceResult {
  modelVersionId: number;
  settledShadowPredictions: number;
  averageBrierScore: number | null;
  predictions: ShadowPrediction[];
}

function fmt(value: unknown): string {
  if (value === null || value === undefined || value === "") return "–";
  return String(value);
}

const inputClass =
  "w-40 rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-900 focus:border-phoenix-gold focus:outline-none focus:ring-1 focus:ring-phoenix-gold";

export default function ShadowClient() {
  const [batchAction, setBatchAction] = useState<BatchAction>(null);
  const [batchBusy, setBatchBusy] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [batchResult, setBatchResult] = useState<string | null>(null);

  const [modelVersionId, setModelVersionId] = useState("");
  const [perf, setPerf] = useState<PerformanceResult | null>(null);
  const [perfState, setPerfState] = useState<"idle" | "loading" | "loaded" | "error" | "unreachable">("idle");

  async function runBatchAction() {
    if (!batchAction) return;
    setBatchBusy(true);
    setBatchError(null);
    try {
      const res = await fetch(`/api/model-lab/shadow/${batchAction}`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setBatchError(data?.error ?? `Fehler (Status ${res.status}).`);
        return;
      }
      const count = batchAction === "generate" ? data?.created : data?.settled;
      setBatchResult(`${batchAction === "generate" ? "Erstellt" : "Abgerechnet"}: ${count ?? "–"}`);
      setBatchAction(null);
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
    { header: "Liga", cell: (p) => p.league_id },
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

      <Card title="Shadow-Predictions verwalten">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={() => { setBatchAction("generate"); setBatchError(null); }}>
            Ausstehende generieren
          </Button>
          <Button variant="secondary" onClick={() => { setBatchAction("settle"); setBatchError(null); }}>
            Ausstehende abrechnen
          </Button>
          {batchResult && <span className="text-sm text-neutral-500">{batchResult}</span>}
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
                <p className="text-xs text-neutral-500">Settled Predictions</p>
                <p className="mt-0.5 text-xl font-semibold text-neutral-900">{perf.settledShadowPredictions}</p>
              </div>
              <div className="rounded-md border border-neutral-100 bg-neutral-50 px-3 py-2.5">
                <p className="text-xs text-neutral-500">Ø Brier Score</p>
                <p className="mt-0.5 text-xl font-semibold text-neutral-900">{perf.averageBrierScore ?? "–"}</p>
              </div>
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
