"use client";

import { useCallback, useEffect, useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import DataTable, { Column } from "@/components/ui/DataTable";
import StateMessage from "@/components/ui/StateMessage";
import ConfirmDialog from "@/components/ConfirmDialog";
import type { MonthlyReview } from "@/lib/types";

type LoadState = "loading" | "loaded" | "unreachable" | "error";

function recommendationTone(recommendation: string): "green" | "gold" | "neutral" {
  if (recommendation.toLowerCase().includes("promot")) return "gold";
  if (recommendation.toLowerCase().includes("keep") || recommendation.toLowerCase().includes("hold")) return "green";
  return "neutral";
}

function fmt(value: unknown): string {
  if (value === null || value === undefined || value === "") return "–";
  return String(value);
}

export default function ReviewsClient() {
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
    { header: "Liga", cell: (r) => fmt(r.league_id ?? "GLOBAL") },
    { header: "Markt", cell: (r) => r.market },
    { header: "Champion", cell: (r) => fmt(r.champion_model_id) },
    { header: "Challenger", cell: (r) => fmt(r.challenger_model_id) },
    { header: "Sample", cell: (r) => fmt(r.same_match_sample) },
    { header: "Empfehlung", cell: (r) => <Badge tone={recommendationTone(r.recommendation)}>{r.recommendation}</Badge> },
    { header: "Begründung", cell: (r) => fmt(r.reason) },
    { header: "Geprüft am", cell: (r) => fmt(r.reviewed_at) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Reviews</h1>
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
