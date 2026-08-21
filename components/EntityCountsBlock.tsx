"use client";

import { useEffect, useState } from "react";
import type { DataCoverageResponse, PerformanceSummary } from "@/lib/types";

function formatDateTime(iso: string | null): string {
  if (!iso) return "–";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "–";
  return `${date.toLocaleDateString("de-DE")} · ${date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr`;
}

/**
 * Section 3 / 12 (Liga/Team Übersicht): "auf einen Blick" Zähler-Kacheln,
 * serverseitig über den vollen Datensatz berechnet (kein Zeitraumfilter,
 * keine Pagination-Kappe) - wiederverwendet dieselben Endpoints wie
 * EntityPerformancePanel/DataCoveragePanel statt eigene Zählformeln zu
 * erfinden (Section 23).
 */
export default function EntityCountsBlock({ leagueId, teamId }: { leagueId?: string; teamId?: string }) {
  const [summary, setSummary] = useState<PerformanceSummary | null>(null);
  const [coverage, setCoverage] = useState<DataCoverageResponse | null>(null);
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    const perfQs = new URLSearchParams();
    if (leagueId) perfQs.set("leagueId", leagueId);
    if (teamId) perfQs.set("teamId", teamId);
    const covQs = new URLSearchParams();
    if (leagueId) covQs.set("leagueId", leagueId);
    if (teamId) covQs.set("teamId", teamId);
    Promise.all([
      fetch(`/api/football/performance?${perfQs.toString()}`).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/football/data-coverage-detail?${covQs.toString()}`).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([perf, cov]) => {
        if (cancelled) return;
        setSummary(perf?.summary ?? null);
        setCoverage(cov ?? null);
        setState("loaded");
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [leagueId, teamId]);

  if (state === "loading") return <p className="text-sm text-neutral-400">Wird geladen…</p>;
  if (state === "error") return <p className="text-sm text-neutral-400">Zähler konnten nicht geladen werden.</p>;

  const settled = summary ? summary.won + summary.lost + summary.push : null;

  const tiles: { label: string; value: string }[] = [
    { label: "Gespeicherte Spiele", value: coverage ? String(coverage.sampleSize) : "Keine Daten" },
    { label: "Analysiert", value: summary ? String(summary.sampleSize) : "Keine Daten" },
    { label: "PHÖNIX Tipps", value: summary ? String(summary.withTip) : "Keine Daten" },
    { label: "Settled", value: settled !== null ? String(settled) : "Keine Daten" },
    { label: "Offen", value: summary ? String(summary.pending) : "Keine Daten" },
    {
      label: "Datenabdeckung",
      value: coverage?.overallCoveragePercent != null ? `${coverage.overallCoveragePercent.toFixed(0)} %` : "Keine Daten",
    },
    { label: "Letztes Update", value: coverage ? formatDateTime(coverage.lastUpdated) : "Keine Daten" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
      {tiles.map((t) => (
        <div key={t.label} className="rounded-md border border-neutral-100 bg-neutral-50 px-3 py-2.5">
          <p className="text-xs text-neutral-500">{t.label}</p>
          <p className="mt-0.5 text-lg font-semibold text-neutral-900">{t.value}</p>
        </div>
      ))}
    </div>
  );
}
