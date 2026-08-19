"use client";

import { useCallback, useEffect, useState } from "react";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import DataTable, { Column } from "@/components/ui/DataTable";
import InfoTooltip from "@/components/ui/InfoTooltip";
import StateMessage from "@/components/ui/StateMessage";
import type { PremiumFeature } from "@/lib/types";

type LoadState = "loading" | "loaded" | "unreachable" | "error";

const TIERS = ["FREE", "PREMIUM", "DISABLED"];

function tierTone(tier: string): "green" | "gold" | "red" {
  if (tier === "PREMIUM") return "gold";
  if (tier === "DISABLED") return "red";
  return "green";
}

const selectClass =
  "rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-900 focus:border-phoenix-gold focus:outline-none focus:ring-1 focus:ring-phoenix-gold";

function fmt(value: unknown): string {
  if (value === null || value === undefined || value === "") return "–";
  return String(value);
}

export default function PremiumFeatureMatrixClient() {
  const [features, setFeatures] = useState<PremiumFeature[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const res = await fetch("/api/premium/features");
      if (res.status === 502) {
        setState("unreachable");
        return;
      }
      if (!res.ok) {
        setState("error");
        return;
      }
      const data = await res.json().catch(() => null);
      setFeatures(Array.isArray(data?.features) ? data.features : []);
      setState("loaded");
    } catch {
      setState("unreachable");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleTierChange(featureKey: string, tier: string) {
    setSavingKey(featureKey);
    setError(null);
    try {
      const res = await fetch(`/api/premium/features/${encodeURIComponent(featureKey)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? `Fehler (Status ${res.status}).`);
        return;
      }
      setFeatures((prev) => prev.map((f) => (f.feature_key === featureKey ? data.feature : f)));
    } catch {
      setError("Verbindung zum Backend fehlgeschlagen.");
    } finally {
      setSavingKey(null);
    }
  }

  const columns: Column<PremiumFeature>[] = [
    { header: "Feature", cell: (f) => <span className="font-medium text-neutral-900">{f.feature_label}</span> },
    { header: "Aktuell", info: "FREE = für alle nutzbar. PREMIUM = nur für zahlende Nutzer. DISABLED = für niemanden aktiv.", cell: (f) => <Badge tone={tierTone(f.tier)}>{f.tier}</Badge> },
    {
      header: "Ändern",
      cell: (f) => (
        <select
          className={selectClass}
          value={f.tier}
          disabled={savingKey === f.feature_key}
          onChange={(e) => handleTierChange(f.feature_key, e.target.value)}
        >
          {TIERS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      ),
    },
    { header: "Zuletzt geändert", cell: (f) => fmt(f.updated_at) },
    { header: "Von", cell: (f) => fmt(f.updated_by) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-1.5 text-xl font-semibold text-neutral-900">
          Feature Matrix
          <InfoTooltip text="Legt fest, welche App-Funktionen kostenlos, nur mit Premium oder für niemanden verfügbar sind." />
        </h1>
        <p className="text-sm text-neutral-400">
          Einstufung bereits gebauter Funktionen in FREE (kostenlos) / PREMIUM (kostenpflichtig) / DISABLED
          (deaktiviert). Wird von der App noch nicht ausgelesen — diese Seite ist vorbereitet für später.
        </p>
      </div>

      <Card>
        {state === "loading" && <p className="py-8 text-center text-sm text-neutral-400">Wird geladen…</p>}
        {state === "unreachable" && (
          <StateMessage title="PHÖNIX Backend nicht erreichbar" description="Die Verbindung zum Backend konnte nicht hergestellt werden." />
        )}
        {state === "error" && (
          <StateMessage title="Feature Matrix konnte nicht geladen werden" description="Ein unerwarteter Fehler ist aufgetreten." />
        )}
        {state === "loaded" && (
          <DataTable columns={columns} rows={features} rowKey={(f) => f.feature_key} emptyMessage="Keine Features definiert" />
        )}
        {error && (
          <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}
      </Card>
    </div>
  );
}
