"use client";

import { useCallback, useEffect, useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import DataTable, { Column } from "@/components/ui/DataTable";
import InfoTooltip from "@/components/ui/InfoTooltip";
import StateMessage from "@/components/ui/StateMessage";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useLeagueNames } from "@/lib/useLeagueNames";
import type { MonthlyReview } from "@/lib/types";

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

function fmt(value: unknown): string {
  if (value === null || value === undefined || value === "") return "–";
  return String(value);
}

export default function ReviewsClient() {
  const { leagueName } = useLeagueNames();
  const [reviews, setReviews] = useState<MonthlyReview[]>([]);
  const [state, setState] = useState<LoadState>("loading");

  const [confirmRun, setConfirmRun] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const res = await fetch("/api/model-lab/monthly-reviews");
      if (res.status === 502) {
        setState("unreachable");
        return;
      }
      if (!res.ok) {
        setState("error");
        return;
      }
      const data = await res.json().catch(() => null);
      setReviews(Array.isArray(data?.reviews) ? data.reviews : []);
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

  const columns: Column<MonthlyReview>[] = [
    { header: "Zeitraum", cell: (r) => `${r.review_month}/${r.review_year}` },
    { header: "Liga", cell: (r) => (r.league_id ? leagueName(r.league_id) : "Global") },
    { header: "Markt", cell: (r) => r.market },
    { header: "Champion", info: "ID des aktuell aktiven Modells für diese Liga × Markt-Kombination.", cell: (r) => fmt(r.champion_model_id) },
    { header: "Challenger", info: "ID des Herausforderer-Modells, das mit dem Champion verglichen wurde.", cell: (r) => fmt(r.challenger_model_id) },
    { header: "Sample", info: "Anzahl der Spiele, auf denen dieser Vergleich beruht.", cell: (r) => fmt(r.same_match_sample) },
    { header: "Empfehlung", cell: (r) => <Badge tone={recommendationTone(r.recommendation)}>{recommendationLabel(r.recommendation)}</Badge> },
    { header: "Begründung", cell: (r) => fmt(r.reason) },
    { header: "Geprüft am", cell: (r) => fmt(r.reviewed_at) },
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

      <Card title="Monatliches Review ausführen" action={<span className="text-xs text-neutral-400">Gleiche Logik wie der Mittwochs-Job</span>}>
        <Button onClick={() => setConfirmRun(true)}>Jetzt ausführen</Button>
      </Card>

      <Card title="Review-Historie">
        {state === "loading" && <p className="py-8 text-center text-sm text-neutral-400">Wird geladen…</p>}
        {state === "unreachable" && (
          <StateMessage title="PHÖNIX Backend nicht erreichbar" description="Die Verbindung zum Backend konnte nicht hergestellt werden." />
        )}
        {state === "error" && (
          <StateMessage title="Reviews konnten nicht geladen werden" description="Ein unerwarteter Fehler ist aufgetreten." />
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
    </div>
  );
}
