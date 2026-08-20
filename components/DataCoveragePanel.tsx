"use client";

import { useEffect, useState } from "react";
import InfoTooltip from "@/components/ui/InfoTooltip";
import type { DataCoverageCategory, DataCoverageResponse, DataCoverageStatus } from "@/lib/types";

const CATEGORY_LABEL: Record<string, string> = {
  results: "Ergebnisse",
  standings: "Tabellenposition",
  form: "Form (Heim/Auswärts)",
  h2h: "Head-to-Head",
  odds: "Quoten",
  injuries: "Verletzungen",
  statistics: "Team-Statistiken",
  lineups: "Aufstellungen",
  xg: "xG / xGA",
};

const CATEGORY_ORDER = ["results", "standings", "form", "h2h", "statistics", "odds", "injuries", "lineups", "xg"];

const CATEGORY_INFO: Record<string, string> = {
  results: "Ob das Endergebnis des Spiels gespeichert ist.",
  standings: "Tabellenposition beider Teams zum Zeitpunkt des Spiels.",
  form: "Ergebnisse der letzten Spiele beider Teams (Heim- und Auswärtsform).",
  h2h: "Direkte Duelle beider Teams in der Vergangenheit.",
  odds: "Wettquoten zum Spiel, Basis für Value-Berechnung.",
  injuries: "Bekannte Verletzungen/Sperren zum Spielzeitpunkt.",
  statistics: "Team-Statistiken wie Schüsse, Ballbesitz etc.",
  lineups: "Aufstellungen vor Spielbeginn - von API-Football strukturell nicht bereitgestellt, daher immer 0 %.",
  xg: "Expected Goals / Expected Goals Against - von API-Football strukturell nicht bereitgestellt, daher immer 0 %.",
};

function statusIcon(status: DataCoverageStatus): { icon: string; color: string; label: string } {
  if (status === "available") return { icon: "✓", color: "text-green-600", label: "Vorhanden" };
  if (status === "partial") return { icon: "◐", color: "text-amber-600", label: "Teilweise vorhanden" };
  if (status === "missing") return { icon: "✕", color: "text-red-500", label: "Nicht vorhanden" };
  return { icon: "–", color: "text-neutral-300", label: "Unbekannt" };
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "–";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "–";
  return `${date.toLocaleDateString("de-DE")} · ${date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr`;
}

export default function DataCoveragePanel({ leagueId, teamId }: { leagueId?: string; teamId?: string }) {
  const [data, setData] = useState<DataCoverageResponse | null>(null);
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    const qs = new URLSearchParams();
    if (leagueId) qs.set("leagueId", leagueId);
    if (teamId) qs.set("teamId", teamId);
    fetch(`/api/football/data-coverage-detail?${qs.toString()}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((json: DataCoverageResponse) => {
        if (!cancelled) {
          setData(json);
          setState("loaded");
        }
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [leagueId, teamId]);

  if (state === "loading") return <p className="text-sm text-neutral-400">Wird geladen…</p>;
  if (state === "error" || !data) {
    return <p className="text-sm text-neutral-400">Datenabdeckung konnte nicht geladen werden.</p>;
  }

  if (data.sampleSize === 0) {
    return <p className="text-sm text-neutral-400">Noch keine Scans vorhanden - Datenabdeckung kann noch nicht ermittelt werden.</p>;
  }

  const entries = CATEGORY_ORDER.filter((key) => key in data.categories).map((key) => [key, data.categories[key]] as [string, DataCoverageCategory]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-neutral-500">
        <span>
          Basis: {data.sampleSize} gescannte Spiele
          {data.overallCoveragePercent != null && ` · Ø Datenqualität ${data.overallCoveragePercent.toFixed(0)} %`}
        </span>
        <span>Letztes Update: {formatDateTime(data.lastUpdated)}</span>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map(([key, cat]) => {
          const s = statusIcon(cat.status);
          return (
            <div key={key} className="flex items-center justify-between gap-2 rounded-md border border-neutral-100 px-3 py-2">
              <span className="inline-flex items-center gap-1 text-sm text-neutral-700">
                {CATEGORY_LABEL[key] ?? key}
                {CATEGORY_INFO[key] && <InfoTooltip text={CATEGORY_INFO[key]} />}
              </span>
              <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${s.color}`} title={s.label}>
                {cat.coveragePercent.toFixed(0)} % <span aria-hidden>{s.icon}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
