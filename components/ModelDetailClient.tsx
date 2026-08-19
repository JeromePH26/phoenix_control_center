"use client";

import { useCallback, useEffect, useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import DataTable, { Column } from "@/components/ui/DataTable";
import InfoTooltip from "@/components/ui/InfoTooltip";
import JsonViewer from "@/components/ui/JsonViewer";
import KeyValueList from "@/components/ui/KeyValueList";
import StateMessage from "@/components/ui/StateMessage";
import ConfirmDialog from "@/components/ConfirmDialog";
import type { ModelEvaluation, ModelLabOverview, ModelVersionDetail } from "@/lib/types";

type LoadState = "loading" | "loaded" | "notfound" | "unreachable" | "error";

function fmt(value: unknown): string {
  if (value === null || value === undefined || value === "") return "–";
  return String(value);
}

const MODEL_STATUS_LABEL: Record<string, string> = {
  champion: "Champion (aktiv)",
  challenger: "Herausforderer",
  retired: "Ausgemustert",
};
function modelStatusLabel(status: string): string {
  return MODEL_STATUS_LABEL[status] ?? status;
}

export default function ModelDetailClient({ id }: { id: string }) {
  const [model, setModel] = useState<ModelVersionDetail | null>(null);
  const [overview, setOverview] = useState<ModelLabOverview | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [action, setAction] = useState<"promote" | "rollback" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const [modelRes, overviewRes] = await Promise.all([
        fetch(`/api/model-lab/models/${encodeURIComponent(id)}`),
        fetch("/api/model-lab/overview"),
      ]);
      if (modelRes.status === 404) {
        setState("notfound");
        return;
      }
      if (modelRes.status === 502) {
        setState("unreachable");
        return;
      }
      if (!modelRes.ok) {
        setState("error");
        return;
      }
      const data = await modelRes.json().catch(() => null);
      setModel(data);
      if (overviewRes.ok) {
        setOverview(await overviewRes.json().catch(() => null));
      }
      setState("loaded");
    } catch {
      setState("unreachable");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleConfirm() {
    if (!action) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/model-lab/models/${encodeURIComponent(id)}/${action}`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? `Fehler (Status ${res.status}).`);
        return;
      }
      setAction(null);
      load();
    } catch {
      setError("Verbindung zum Backend fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  const EVAL_TYPE_LABEL: Record<string, string> = {
    walk_forward: "Test an echten, vergangenen Spielen",
    holdout: "Test an echten, vergangenen Spielen",
    shadow: "Live-Vergleich zum Champion",
    monthly_review: "Monatlicher Check",
  };

  const evaluationColumns: Column<ModelEvaluation>[] = [
    {
      header: "Testart",
      cell: (e) => <Badge tone="neutral">{EVAL_TYPE_LABEL[e.evaluation_type] ?? e.evaluation_type}</Badge>,
    },
    { header: "Umfang", info: "Welche Spiele einbezogen wurden (z.B. alle oder nur 'saubere' Fälle ohne Störfaktoren).", cell: (e) => fmt(e.match_scope) },
    { header: "Liga", cell: (e) => fmt(e.league_id ?? "GLOBAL") },
    { header: "Stichprobe", info: "Anzahl Spiele, auf denen dieses Testergebnis beruht.", cell: (e) => fmt(e.sample_size) },
    {
      header: "Brier Score",
      info: "Misst, wie gut die vorhergesagten Wahrscheinlichkeiten zum tatsächlichen Ausgang gepasst haben. Niedriger = besser, 0 wäre perfekt.",
      cell: (e) => fmt(e.brier_score),
    },
    {
      header: "Log Loss",
      info: "Ähnlich wie Brier Score, bestraft aber sehr selbstsichere Fehlvorhersagen stärker. Niedriger = besser.",
      cell: (e) => fmt(e.log_loss),
    },
    { header: "Trefferquote", info: "Anteil der Spiele, bei denen die wahrscheinlichste Vorhersage tatsächlich eingetroffen ist. Höher = besser.", cell: (e) => fmt(e.accuracy) },
    { header: "Fiktiver Gewinn (ROI)", info: "Fiktiver Gewinn/Verlust in Prozent, wenn man nach diesem Modell gewettet hätte.", cell: (e) => fmt(e.roi) },
    { header: "Erstellt", cell: (e) => fmt(e.created_at) },
  ];

  const promotionEnabled = overview?.promotionEnabled ?? false;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-1.5 text-xl font-semibold text-neutral-900">
          Modell-Details
          <InfoTooltip text="Details zu einer einzelnen Version eines Vorhersage-Modells: wie gut es abschneidet und was es beeinflusst." />
        </h1>
      </div>

      {state === "loading" && <p className="text-sm text-neutral-400">Wird geladen…</p>}
      {state === "notfound" && <StateMessage title="Modell nicht gefunden" description="Für diese ID liegen keine Daten vor." />}
      {state === "unreachable" && (
        <StateMessage title="PHÖNIX Backend nicht erreichbar" description="Die Verbindung zum Backend konnte nicht hergestellt werden." />
      )}
      {state === "error" && (
        <StateMessage title="Modell konnte nicht geladen werden" description="Ein unerwarteter Fehler ist aufgetreten." />
      )}

      {state === "loaded" && model && (
        <>
          <Card title={model.readable_version} action={<Badge tone={model.status === "champion" ? "gold" : "neutral"}>{modelStatusLabel(model.status)}</Badge>}>
            <KeyValueList
              data={{
                Liga: model.league_id ?? "GLOBAL",
                Markt: model.market,
                Generation: model.generation,
                "Übergeordnetes Modell": model.parent_model_id,
                "Trainiert mit (Spiele)": model.training_count,
                "Geprüft mit (Spiele)": model.validation_count,
                "Zusätzlich getestet mit (Spiele)": model.holdout_count,
                "Im Live-Vergleich getestet (Spiele)": model.shadow_count,
                "Champion seit": model.champion_since,
                "Letzte Beförderung": model.last_promotion_at,
                "Vorheriger Champion": model.previous_champion_id,
                Erstellt: model.created_at,
              }}
              info={{
                "Übergeordnetes Modell": "Aus welchem Vorgänger-Modell dieses hervorgegangen ist (falls es eine Weiterentwicklung ist).",
              }}
            />
          </Card>

          {!promotionEnabled && (
            <StateMessage
              title="Beförderung ist deaktiviert"
              description="Ein Modell kann aktuell nicht zum Champion befördert werden — das ist serverseitig gesperrt, unabhängig von dieser Ansicht."
            />
          )}

          <Card title="Aktionen" action={<span className="text-xs text-neutral-400">Vorsicht, wirkt sich direkt auf echte Tipps aus</span>}>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="primary"
                disabled={model.status === "champion"}
                onClick={() => {
                  setAction("promote");
                  setError(null);
                }}
              >
                Zum Champion befördern
              </Button>
              <Button
                variant="danger"
                disabled={model.status !== "champion"}
                onClick={() => {
                  setAction("rollback");
                  setError(null);
                }}
              >
                Zurück zu diesem Modell wechseln
              </Button>
            </div>
          </Card>

          <Card
            title={
              <span className="inline-flex items-center gap-1">
                Interne Modell-Daten
                <InfoTooltip text="Rohdaten des Modells (Gewichte, verwendete Merkmale, Bewertungszusammenfassung) — rein technisch, für Entwickler relevant." />
              </span>
            }
          >
            <div className="flex gap-4">
              <JsonViewer value={model.weights} label="Gewichte" />
              <JsonViewer value={model.feature_config} label="Merkmale" />
              <JsonViewer value={model.evaluation_summary} label="Auswertungs-Zusammenfassung" />
            </div>
          </Card>

          <Card title="Evaluationen">
            <DataTable
              columns={evaluationColumns}
              rows={model.evaluations ?? []}
              rowKey={(e) => String(e.id)}
              emptyMessage="Keine Evaluationen vorhanden"
            />
          </Card>
        </>
      )}

      {action && (
        <ConfirmDialog
          title={action === "promote" ? "Zum Champion befördern" : "Rollback durchführen"}
          description={
            action === "promote"
              ? `"${model?.readable_version}" wird neuer Champion für ${model?.league_id ?? "GLOBAL"} × ${model?.market}. Der bisherige Champion wird abgelöst.`
              : `Champion für ${model?.league_id ?? "GLOBAL"} × ${model?.market} wird auf "${model?.readable_version}" zurückgesetzt.`
          }
          confirmLabel="Bestätigen"
          busy={busy}
          error={error}
          onConfirm={handleConfirm}
          onClose={() => setAction(null)}
        />
      )}
    </div>
  );
}
