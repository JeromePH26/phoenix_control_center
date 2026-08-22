"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import DataTable, { Column } from "@/components/ui/DataTable";
import InfoTooltip from "@/components/ui/InfoTooltip";
import JsonViewer from "@/components/ui/JsonViewer";
import LoadingState from "@/components/ui/LoadingState";
import StateMessage from "@/components/ui/StateMessage";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useLeagueNames } from "@/lib/useLeagueNames";
import type { ModelLabOverview, MonthlyReview } from "@/lib/types";

type LoadState = "loading" | "loaded" | "unreachable" | "error";

const RECOMMENDATION_LABEL: Record<string, string> = {
  PROMOTION_EMPFOHLEN: "Beförderung empfohlen",
  WEITER_TESTEN: "Weiter testen",
  CHALLENGER_SCHLECHTER: "Herausforderer schlechter",
  NICHT_GENUG_DATEN: "Nicht genug Daten",
  KEIN_GEEIGNETER_CHALLENGER: "Kein geeigneter Herausforderer",
};
function recommendationLabel(recommendation: string): string {
  return RECOMMENDATION_LABEL[recommendation] ?? recommendation;
}

function recommendationTone(recommendation: string): "green" | "gold" | "neutral" | "red" {
  if (recommendation === "PROMOTION_EMPFOHLEN") return "gold";
  if (recommendation === "CHALLENGER_SCHLECHTER") return "red";
  if (recommendation === "NICHT_GENUG_DATEN" || recommendation === "KEIN_GEEIGNETER_CHALLENGER") return "neutral";
  return "green";
}

// Section 14 (AN2): "Vorher/Nachher-Vergleich" - Klartext für den
// paarweisen Champion-vs-Challenger-Vergleich (uncertainty.status).
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

function formatNumber(v: number, digits = 4): string {
  return v.toFixed(digits).replace(".", ",");
}

export default function ReviewsClient() {
  const { leagueName } = useLeagueNames();
  const [reviews, setReviews] = useState<MonthlyReview[]>([]);
  const [overview, setOverview] = useState<ModelLabOverview | null>(null);
  const [state, setState] = useState<LoadState>("loading");

  const [confirmRun, setConfirmRun] = useState(false);
  const [promoteReview, setPromoteReview] = useState<MonthlyReview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const [reviewsRes, overviewRes] = await Promise.all([
        fetch("/api/model-lab/monthly-reviews"),
        fetch("/api/model-lab/overview"),
      ]);
      if (reviewsRes.status === 502) {
        setState("unreachable");
        return;
      }
      if (!reviewsRes.ok) {
        setState("error");
        return;
      }
      const data = await reviewsRes.json().catch(() => null);
      setReviews(Array.isArray(data?.reviews) ? data.reviews : []);
      if (overviewRes.ok) setOverview(await overviewRes.json().catch(() => null));
      setState("loaded");
    } catch {
      setState("unreachable");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRun() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/model-lab/monthly-review/run", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? `Fehler (Status ${res.status}).`);
        return;
      }
      setConfirmRun(false);
      load();
    } catch {
      setError("Verbindung zum Backend fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  // Section 14 (AN2): "manuelle Promotion-Freigabe" direkt aus dem Review
  // heraus - ruft denselben, serverseitig gesperrten Promote-Endpunkt auf
  // wie die Modell-Detailseite. Keine automatische Promotion (Abschnitt
  // "Priorität 4"): das Backend blockt trotzdem, wenn
  // PHOENIX_MODEL_PROMOTION_ENABLED=false ist.
  async function handlePromote() {
    if (!promoteReview?.challenger_model_id) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/model-lab/models/${promoteReview.challenger_model_id}/promote`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? `Fehler (Status ${res.status}).`);
        return;
      }
      setPromoteReview(null);
      load();
    } catch {
      setError("Verbindung zum Backend fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  const promotionEnabled = overview?.promotionEnabled ?? false;

  const columns: Column<MonthlyReview>[] = [
    { header: "Zeitraum", cell: (r) => `${r.review_month}/${r.review_year}` },
    { header: "Liga", cell: (r) => (r.league_id ? leagueName(r.league_id) : "Global") },
    { header: "Markt", cell: (r) => r.market },
    {
      header: "Champion",
      info: "Das aktuell aktive Modell für diese Liga × Markt-Kombination.",
      cell: (r) =>
        r.champion_model_id ? (
          <Link href={`/model-lab/models/${r.champion_model_id}`} className="text-phoenix-gold-dark hover:underline">
            #{r.champion_model_id}
          </Link>
        ) : (
          "–"
        ),
    },
    {
      header: "Challenger",
      info: "Das Herausforderer-Modell, das mit dem Champion verglichen wurde.",
      cell: (r) =>
        r.challenger_model_id ? (
          <Link href={`/model-lab/models/${r.challenger_model_id}`} className="text-phoenix-gold-dark hover:underline">
            #{r.challenger_model_id}
          </Link>
        ) : (
          "–"
        ),
    },
    {
      header: "Vorher/Nachher-Vergleich",
      info: "Statistischer Vergleich der Vorhersagegüte (Brier-Score-Differenz Challenger minus Champion, negativ = Herausforderer besser) mit 95%-Konfidenzintervall.",
      cell: (r) =>
        r.uncertainty ? (
          <div className="space-y-0.5">
            <Badge tone={comparisonTone(r.uncertainty.status)}>{comparisonLabel(r.uncertainty.status)}</Badge>
            <p className="text-xs text-neutral-400">
              Δ {formatNumber(r.uncertainty.meanDifference)} (95%-CI [{formatNumber(r.uncertainty.lowerBound)},{" "}
              {formatNumber(r.uncertainty.upperBound)}], n={r.uncertainty.sampleSize})
            </p>
            {r.metrics && <JsonViewer value={r.metrics} label="Alle Kandidaten" />}
          </div>
        ) : (
          <span className="text-neutral-300">–</span>
        ),
    },
    { header: "Sample", info: "Anzahl der Spiele, auf denen dieser Vergleich beruht.", cell: (r) => fmt(r.same_match_sample) },
    { header: "Empfehlung", cell: (r) => <Badge tone={recommendationTone(r.recommendation)}>{recommendationLabel(r.recommendation)}</Badge> },
    { header: "Begründung", cell: (r) => fmt(r.reason) },
    { header: "Geprüft am", cell: (r) => formatDateTime(r.reviewed_at) },
    {
      header: "Aktion",
      cell: (r) =>
        r.recommendation === "PROMOTION_EMPFOHLEN" && r.challenger_model_id ? (
          <Button
            variant="primary"
            disabled={!promotionEnabled}
            onClick={() => {
              setPromoteReview(r);
              setError(null);
            }}
          >
            Befördern
          </Button>
        ) : (
          <span className="text-neutral-300">–</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-1.5 text-xl font-semibold text-neutral-900">
          Reviews
          <InfoTooltip text="Einmal im Monat vergleicht PHÖNIX automatisch Champion und Challenger und gibt eine Empfehlung ab (z.B. 'befördern' oder 'behalten') — entschieden wird aber immer manuell." />
        </h1>
        <p className="text-sm text-neutral-400">
          Monatliche Champion-Reviews. V0: keine automatische Promotion — Empfehlungen müssen manuell bestätigt werden.
        </p>
      </div>

      {!promotionEnabled && (
        <StateMessage
          title="Beförderung ist deaktiviert"
          description="Ein Modell kann aktuell nicht zum Champion befördert werden — das ist serverseitig gesperrt (PHOENIX_MODEL_PROMOTION_ENABLED=false), unabhängig von der Empfehlung hier."
        />
      )}

      <Card title="Monatliches Review ausführen" action={<span className="text-xs text-neutral-400">Gleiche Logik wie der Mittwochs-Job</span>}>
        <Button onClick={() => setConfirmRun(true)}>Jetzt ausführen</Button>
      </Card>

      <Card title="Review-Historie">
        {state === "loading" && <LoadingState />}
        {state === "unreachable" && (
          <StateMessage
            title="PHÖNIX Backend nicht erreichbar"
            description="Die Verbindung zum Backend konnte nicht hergestellt werden."
            onRetry={load}
          />
        )}
        {state === "error" && (
          <StateMessage title="Reviews konnten nicht geladen werden" description="Ein unerwarteter Fehler ist aufgetreten." onRetry={load} />
        )}
        {state === "loaded" && (
          <DataTable columns={columns} rows={reviews} rowKey={(r) => String(r.id)} emptyMessage="Noch keine Reviews" />
        )}
      </Card>

      {confirmRun && (
        <ConfirmDialog
          title="Monatliches Review ausführen"
          description="Führt das Champion-Review für alle Liga × Markt-Kombinationen jetzt aus (ignoriert das First-Wednesday-Datumsgate)."
          confirmLabel="Ausführen"
          busy={busy}
          error={error}
          onConfirm={handleRun}
          onClose={() => setConfirmRun(false)}
        />
      )}

      {promoteReview && (
        <ConfirmDialog
          title="Zum Champion befördern"
          description={`Herausforderer #${promoteReview.challenger_model_id} wird neuer Champion für ${
            promoteReview.league_id ? leagueName(promoteReview.league_id) : "Global"
          } × ${promoteReview.market}, basierend auf der Review-Empfehlung. Der bisherige Champion (#${promoteReview.champion_model_id}) wird abgelöst.`}
          confirmLabel="Befördern"
          busy={busy}
          error={error}
          onConfirm={handlePromote}
          onClose={() => setPromoteReview(null)}
        />
      )}
    </div>
  );
}
