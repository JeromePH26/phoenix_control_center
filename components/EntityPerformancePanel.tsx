"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Badge from "@/components/ui/Badge";
import InfoTooltip from "@/components/ui/InfoTooltip";
import type { FootballTip, PerformanceAggregateResponse, PerformanceByMarket, PerformanceTimeSeriesPoint } from "@/lib/types";

type Period = "7d" | "30d" | "3m" | "6m" | "1y" | "all" | "custom";
const PERIOD_LABEL: Record<Period, string> = {
  "7d": "7 Tage",
  "30d": "30 Tage",
  "3m": "3 Monate",
  "6m": "6 Monate",
  "1y": "1 Jahr",
  all: "Gesamt",
  custom: "Benutzerdefiniert",
};

type Metric = "hitRatePercent" | "roiPercent" | "yieldPercent" | "profitUnits" | "tipCount" | "avgOdds" | "avgValuePercent";
const METRIC_LABEL: Record<Metric, string> = {
  hitRatePercent: "Trefferquote",
  roiPercent: "ROI",
  yieldPercent: "Yield",
  profitUnits: "Gewinn/Verlust",
  tipCount: "Anzahl Tipps",
  avgOdds: "Ø Quote",
  avgValuePercent: "Ø Value",
};
function formatMetricValue(metric: Metric, v: number): string {
  if (metric === "tipCount") return String(Math.round(v));
  if (metric === "avgOdds") return v.toFixed(2);
  if (metric === "profitUnits") return `${v >= 0 ? "+" : ""}${(Math.round(v * 100) / 100).toFixed(2)} Einh.`;
  return `${v >= 0 ? "+" : ""}${Math.round(v * 10) / 10} %`;
}

const MARKET_LABEL: Record<string, string> = {
  homeWin: "Heimsieg",
  draw: "Unentschieden",
  awayWin: "Auswärtssieg",
  over25: "Über 2,5 Tore",
  under25: "Unter 2,5 Tore",
  bttsYes: "Beide Teams treffen – Ja",
  bttsNo: "Beide Teams treffen – Nein",
};
function marketLabel(key: string): string {
  return MARKET_LABEL[key] ?? key;
}

const SMALL_SAMPLE_THRESHOLD = 20;

function pct(value: number | null | undefined): string {
  if (value === null || value === undefined) return "–";
  return `${Math.round(value * 10) / 10} %`;
}
function signedPct(value: number | null | undefined): string {
  if (value === null || value === undefined) return "–";
  const rounded = Math.round(value * 10) / 10;
  return `${rounded >= 0 ? "+" : ""}${rounded} %`;
}
function deltaPoints(current: number | null, previous: number | null | undefined): string | null {
  if (current === null || previous === null || previous === undefined) return null;
  const diff = Math.round((current - previous) * 10) / 10;
  return `${diff >= 0 ? "+" : ""}${diff} Prozentpunkte`;
}

function periodRange(period: Period, customFrom: string, customTo: string): { from?: string; to?: string } {
  if (period === "all") return {};
  if (period === "custom") {
    return {
      from: customFrom ? new Date(customFrom).toISOString() : undefined,
      to: customTo ? new Date(customTo).toISOString() : undefined,
    };
  }
  const days = period === "7d" ? 7 : period === "30d" ? 30 : period === "3m" ? 90 : period === "6m" ? 180 : 365;
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  return { from: from.toISOString(), to: to.toISOString() };
}

const inputClass =
  "rounded-md border border-neutral-300 px-2.5 py-1 text-xs text-neutral-900 focus:border-phoenix-gold focus:outline-none focus:ring-1 focus:ring-phoenix-gold";

/**
 * Real, server-computed performance for a league or a team (Section 23:
 * never aggregated client-side from a paginated row set). Shows KPIs,
 * a time-series chart, and a sortable, clickable market comparison table
 * that drills into a focused per-market view with its own chart + tips.
 */
export default function EntityPerformancePanel({
  leagueId,
  teamId,
  mode = "full",
}: {
  leagueId?: string;
  teamId?: string;
  /** "performance" zeigt nur KPIs+Chart (Section 4), "markets" nur die Markt-Tabelle (Section 6/7), "full" beides (Rückwärtskompatibilität). */
  mode?: "full" | "performance" | "markets";
}) {
  const [period, setPeriod] = useState<Period>("3m");
  const [metric, setMetric] = useState<Metric>("hitRatePercent");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [homeAway, setHomeAway] = useState<"" | "home" | "away">("");
  const [minDataQuality, setMinDataQuality] = useState("");
  const [minConfidence, setMinConfidence] = useState("");
  const [sortKey, setSortKey] = useState<keyof PerformanceByMarket>("sampleSize");
  const [sortDesc, setSortDesc] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const focusedMarket = searchParams.get("market");
  function setFocusedMarket(market: string | null) {
    const qs = new URLSearchParams(searchParams.toString());
    if (market) qs.set("market", market);
    else qs.delete("market");
    const query = qs.toString();
    router.replace(`${window.location.pathname}${query ? `?${query}` : ""}`, { scroll: false });
  }

  const [data, setData] = useState<PerformanceAggregateResponse | null>(null);
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading");

  const { from, to } = periodRange(period, customFrom, customTo);

  const load = useCallback(async () => {
    setState("loading");
    const qs = new URLSearchParams();
    if (leagueId) qs.set("leagueId", leagueId);
    if (teamId) qs.set("teamId", teamId);
    if (from) qs.set("dateFrom", from);
    if (to) qs.set("dateTo", to);
    if (teamId && homeAway) qs.set("homeAway", homeAway);
    if (minDataQuality) qs.set("minDataQuality", minDataQuality);
    if (minConfidence) qs.set("minConfidence", minConfidence);
    qs.set("includeMarketBreakdown", "true");
    qs.set("includePreviousPeriod", period !== "all" ? "true" : "false");
    qs.set("groupByTime", period === "7d" || period === "30d" ? "day" : period === "1y" || period === "all" ? "month" : "week");
    try {
      const res = await fetch(`/api/football/performance?${qs.toString()}`);
      if (!res.ok) {
        setState("error");
        return;
      }
      setData(await res.json());
      setState("loaded");
    } catch {
      setState("error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leagueId, teamId, from, to, homeAway, minDataQuality, minConfidence, period]);

  useEffect(() => {
    load();
  }, [load]);

  // Fokussierte Marktansicht: eigener kleiner Fetch mit marketKey-Filter,
  // damit Chart + Kennzahlen exakt für diesen einen Markt gelten.
  const [marketData, setMarketData] = useState<PerformanceAggregateResponse | null>(null);
  const [marketTips, setMarketTips] = useState<FootballTip[]>([]);
  useEffect(() => {
    if (!focusedMarket) {
      setMarketData(null);
      setMarketTips([]);
      return;
    }
    let cancelled = false;
    const qs = new URLSearchParams();
    if (leagueId) qs.set("leagueId", leagueId);
    if (teamId) qs.set("teamId", teamId);
    if (from) qs.set("dateFrom", from);
    if (to) qs.set("dateTo", to);
    if (teamId && homeAway) qs.set("homeAway", homeAway);
    qs.set("marketKey", focusedMarket);
    qs.set("groupByTime", period === "7d" || period === "30d" ? "day" : "week");
    fetch(`/api/football/performance?${qs.toString()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!cancelled) setMarketData(json);
      });
    const tipsQs = new URLSearchParams();
    if (leagueId) tipsQs.set("leagueId", leagueId);
    if (teamId) tipsQs.set("teamId", teamId);
    tipsQs.set("marketKey", focusedMarket);
    tipsQs.set("limit", "50");
    fetch(`/api/football/tips?${tipsQs.toString()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!cancelled) setMarketTips(Array.isArray(json?.tips) ? json.tips : []);
      });
    return () => {
      cancelled = true;
    };
  }, [focusedMarket, leagueId, teamId, from, to, homeAway, period]);

  const sortedMarkets = useMemo(() => {
    const rows = data?.byMarket ?? [];
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const an = typeof av === "number" ? av : -Infinity;
      const bn = typeof bv === "number" ? bv : -Infinity;
      return sortDesc ? bn - an : an - bn;
    });
    return copy;
  }, [data, sortKey, sortDesc]);

  function toggleSort(key: keyof PerformanceByMarket) {
    if (sortKey === key) setSortDesc((d) => !d);
    else {
      setSortKey(key);
      setSortDesc(true);
    }
  }

  const summary = data?.summary;
  const previous = data?.previousPeriod;
  const isSmallSample = (summary?.won ?? 0) + (summary?.lost ?? 0) < SMALL_SAMPLE_THRESHOLD;

  if (focusedMarket && marketData) {
    const fSummary = marketData.summary;
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setFocusedMarket(null)}
          className="text-xs text-phoenix-gold-dark hover:underline"
        >
          ← Zurück zur Marktübersicht
        </button>
        <h3 className="text-lg font-semibold text-neutral-900">{marketLabel(focusedMarket)}</h3>
        <KpiGrid summary={fSummary} isSmallSample={fSummary.won + fSummary.lost < SMALL_SAMPLE_THRESHOLD} />
        <MetricSelect metric={metric} onChange={setMetric} />
        <Chart series={marketData.timeSeries ?? []} metric={metric} />
        <div>
          <p className="mb-2 text-sm font-medium text-neutral-700">Zugehörige Tipps</p>
          <TipsTable tips={marketTips} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-wrap gap-1">
          {(Object.keys(PERIOD_LABEL) as Period[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`rounded-md border px-2.5 py-1 text-xs font-medium ${
                period === p
                  ? "border-phoenix-gold bg-phoenix-gold/10 text-phoenix-gold-dark"
                  : "border-neutral-300 text-neutral-600 hover:bg-neutral-50"
              }`}
            >
              {PERIOD_LABEL[p]}
            </button>
          ))}
        </div>
        {period === "custom" && (
          <div className="flex items-end gap-2">
            <div>
              <label className="mb-1 block text-[10px] text-neutral-500">Von</label>
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-[10px] text-neutral-500">Bis</label>
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className={inputClass} />
            </div>
          </div>
        )}
        {teamId && (
          <div>
            <label className="mb-1 block text-[10px] text-neutral-500">Heim/Auswärts</label>
            <select value={homeAway} onChange={(e) => setHomeAway(e.target.value as "" | "home" | "away")} className={inputClass}>
              <option value="">Alle</option>
              <option value="home">Nur Heim</option>
              <option value="away">Nur Auswärts</option>
            </select>
          </div>
        )}
        <div>
          <label className="mb-1 block text-[10px] text-neutral-500">Min. Datenqualität</label>
          <input
            type="number"
            min={0}
            max={100}
            value={minDataQuality}
            onChange={(e) => setMinDataQuality(e.target.value)}
            className={`${inputClass} w-16`}
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] text-neutral-500">Min. Vertrauen</label>
          <input
            type="number"
            min={0}
            max={100}
            value={minConfidence}
            onChange={(e) => setMinConfidence(e.target.value)}
            className={`${inputClass} w-16`}
          />
        </div>
      </div>

      {state === "loading" && <p className="text-sm text-neutral-400">Wird geladen…</p>}
      {state === "error" && <p className="text-sm text-red-600">Performance konnte nicht geladen werden.</p>}

      {state === "loaded" && summary && (
        <>
          {isSmallSample && (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-700">
              Geringe Datenbasis ({summary.won + summary.lost} entschiedene Tipps) - Werte noch wenig aussagekräftig.
            </p>
          )}
          {mode !== "markets" && (
            <>
              <KpiGrid summary={summary} isSmallSample={isSmallSample} previous={previous} />
              <MetricSelect metric={metric} onChange={setMetric} />
              {(data?.timeSeries?.length ?? 0) === 0 ? (
                <p className="text-sm text-neutral-400">Für diesen Zeitraum liegen noch nicht genügend Daten vor.</p>
              ) : (
                <Chart series={data!.timeSeries!} metric={metric} />
              )}
            </>
          )}

          {mode !== "performance" && (
          <div>
            <p className="mb-2 flex items-center gap-1 text-sm font-medium text-neutral-700">
              Markt-Performance
              <InfoTooltip text="Klick auf einen Markt für eine eigene Detailansicht mit Chart und den zugehörigen Tipps." />
            </p>
            {sortedMarkets.length === 0 ? (
              <p className="text-sm text-neutral-400">Keine Marktdaten für diesen Zeitraum.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500">
                      <th className="py-2 pr-4 font-medium">Markt</th>
                      {(
                        [
                          ["hitRatePercent", "Trefferquote"],
                          ["won", "Gewonnen"],
                          ["lost", "Verloren"],
                          ["roiPercent", "ROI"],
                          ["avgOdds", "Ø Quote"],
                          ["sampleSize", "Sample"],
                        ] as [keyof PerformanceByMarket, string][]
                      ).map(([key, label]) => (
                        <th
                          key={key}
                          className="cursor-pointer select-none py-2 pr-4 font-medium hover:text-neutral-700"
                          onClick={() => toggleSort(key)}
                        >
                          {label} {sortKey === key ? (sortDesc ? "↓" : "↑") : ""}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {sortedMarkets.map((m) => (
                      <tr
                        key={m.marketKey}
                        onClick={() => setFocusedMarket(m.marketKey)}
                        className="cursor-pointer hover:bg-neutral-50"
                      >
                        <td className="py-2 pr-4 font-medium text-neutral-900">{marketLabel(m.marketKey)}</td>
                        <td className="py-2 pr-4">
                          {m.hitRatePercent === null ? (
                            "–"
                          ) : (
                            <Badge tone={m.hitRatePercent >= 50 ? "green" : "red"}>{pct(m.hitRatePercent)}</Badge>
                          )}
                        </td>
                        <td className="py-2 pr-4 text-emerald-700">{m.won}</td>
                        <td className="py-2 pr-4 text-red-700">{m.lost}</td>
                        <td className="py-2 pr-4">{m.roiPercent === null ? "–" : signedPct(m.roiPercent)}</td>
                        <td className="py-2 pr-4 text-neutral-500">{m.avgOdds === null ? "–" : m.avgOdds.toFixed(2)}</td>
                        <td className="py-2 pr-4 text-neutral-400">
                          {m.sampleSize}
                          {m.won + m.lost < SMALL_SAMPLE_THRESHOLD && (
                            <span className="ml-1 text-amber-600" title="Geringe Datenbasis">
                              ⚠
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          )}
        </>
      )}
    </div>
  );
}

function MetricSelect({ metric, onChange }: { metric: Metric; onChange: (m: Metric) => void }) {
  return (
    <div>
      <label className="mb-1 block text-[10px] text-neutral-500">Kennzahl</label>
      <select value={metric} onChange={(e) => onChange(e.target.value as Metric)} className={inputClass}>
        {(Object.keys(METRIC_LABEL) as Metric[]).map((m) => (
          <option key={m} value={m}>
            {METRIC_LABEL[m]}
          </option>
        ))}
      </select>
    </div>
  );
}

function KpiGrid({
  summary,
  isSmallSample,
  previous,
}: {
  summary: PerformanceAggregateResponse["summary"];
  isSmallSample: boolean;
  previous?: PerformanceAggregateResponse["summary"];
}) {
  const hitDelta = previous ? deltaPoints(summary.hitRatePercent, previous.hitRatePercent) : null;
  const roiDelta = previous ? deltaPoints(summary.roiPercent, previous.roiPercent) : null;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
      <div className="rounded-md border border-phoenix-gold/30 bg-phoenix-gold/10 px-3 py-2.5">
        <p className="text-xs text-neutral-500">Trefferquote</p>
        <p className="mt-0.5 text-xl font-semibold text-neutral-900">{pct(summary.hitRatePercent)}</p>
        {hitDelta && <p className="text-[10px] text-neutral-500">{hitDelta} ggü. Vorperiode</p>}
      </div>
      <div className="rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2.5">
        <p className="text-xs text-neutral-500">Gewonnen</p>
        <p className="mt-0.5 text-xl font-semibold text-emerald-700">{summary.won}</p>
      </div>
      <div className="rounded-md border border-red-100 bg-red-50 px-3 py-2.5">
        <p className="text-xs text-neutral-500">Verloren</p>
        <p className="mt-0.5 text-xl font-semibold text-red-700">{summary.lost}</p>
      </div>
      <div className="rounded-md border border-neutral-100 bg-neutral-50 px-3 py-2.5">
        <p className="text-xs text-neutral-500">Void/Push</p>
        <p className="mt-0.5 text-xl font-semibold text-neutral-900">{summary.push}</p>
      </div>
      <div className="rounded-md border border-neutral-100 bg-neutral-50 px-3 py-2.5">
        <p className="flex items-center gap-1 text-xs text-neutral-500">
          ROI
          <InfoTooltip text="Gewinn geteilt durch Einsatz. Yield ist bei PHÖNIX' einheitlicher Einsatzgröße derselbe Wert." />
        </p>
        <p className="mt-0.5 text-xl font-semibold text-neutral-900">{signedPct(summary.roiPercent)}</p>
        {roiDelta && <p className="text-[10px] text-neutral-500">{roiDelta} ggü. Vorperiode</p>}
      </div>
      <div className="rounded-md border border-neutral-100 bg-neutral-50 px-3 py-2.5">
        <p className="text-xs text-neutral-500">Ø Quote</p>
        <p className="mt-0.5 text-xl font-semibold text-neutral-900">{summary.avgOdds === null ? "–" : summary.avgOdds.toFixed(2)}</p>
      </div>
      <div className="rounded-md border border-neutral-100 bg-neutral-50 px-3 py-2.5">
        <p className="text-xs text-neutral-500">Ø Value</p>
        <p className="mt-0.5 text-xl font-semibold text-neutral-900">{signedPct(summary.avgValuePercent)}</p>
      </div>
      <div className="col-span-2 rounded-md border border-neutral-100 bg-neutral-50 px-3 py-2.5 sm:col-span-4 lg:col-span-7">
        <p className="text-xs text-neutral-500">
          {summary.won + summary.lost} entschiedene Tipps · {summary.push} Void/Push · {summary.pending} offen ·{" "}
          {summary.sampleSize} Analysen gesamt
          {isSmallSample && " · geringe Datenbasis"}
        </p>
      </div>
    </div>
  );
}

/** Section 4: Chart zeigt die vom Nutzer gewählte Kennzahl, nicht mehr fest die Trefferquote. Signierte Kennzahlen (ROI/Yield/Gewinn-Verlust/Ø Value) bekommen eine Nulllinie in der Mitte, damit Verluste sichtbar unter die Linie fallen. */
function Chart({ series, metric }: { series: PerformanceTimeSeriesPoint[]; metric: Metric }) {
  const points = series ?? [];
  if (points.length === 0) {
    return <p className="text-sm text-neutral-400">Für diesen Zeitraum liegen noch nicht genügend Daten vor.</p>;
  }
  const signed = new Set<Metric>(["roiPercent", "yieldPercent", "profitUnits", "avgValuePercent"]);
  const isSigned = signed.has(metric);
  const values = points.map((p) => (typeof p[metric] === "number" ? (p[metric] as number) : null));
  const finiteValues = values.filter((v): v is number => v !== null);
  const positiveCeiling = metric === "hitRatePercent" ? 100 : Math.max(...finiteValues.map((v) => Math.abs(v)), 1);
  const chartHeight = 120;
  const barWidth = Math.max(10, Math.min(48, 640 / points.length - 6));
  const gap = 6;
  const zeroY = isSigned ? chartHeight / 2 : chartHeight;
  const usableHeight = isSigned ? chartHeight / 2 : chartHeight;

  return (
    <div className="overflow-x-auto">
      <svg width={Math.max(640, points.length * (barWidth + gap))} height={chartHeight + 36}>
        {isSigned && <line x1={0} y1={zeroY} x2={points.length * (barWidth + gap)} y2={zeroY} stroke="#d4d4d4" strokeWidth={1} />}
        {points.map((p, i) => {
          const v = values[i];
          const x = i * (barWidth + gap);
          const label = new Date(p.period).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
          if (v === null) {
            return (
              <g key={p.period}>
                <title>{label}: keine Daten</title>
                <rect x={x} y={zeroY - 2} width={barWidth} height={2} fill="#e5e5e5" rx={2} />
                <text x={x + barWidth / 2} y={chartHeight + 14} textAnchor="middle" fontSize="9" fill="#737373">
                  {label}
                </text>
              </g>
            );
          }
          const magnitude = Math.min(1, Math.abs(v) / positiveCeiling);
          const barHeight = Math.max(2, magnitude * usableHeight);
          const goodColor = metric === "hitRatePercent" ? v >= 50 : v >= 0;
          const y = isSigned ? (v >= 0 ? zeroY - barHeight : zeroY) : chartHeight - barHeight;
          return (
            <g key={p.period}>
              <title>
                {label}: {formatMetricValue(metric, v)}
              </title>
              <rect x={x} y={y} width={barWidth} height={barHeight} fill={goodColor ? "#10b981" : "#ef4444"} rx={2} />
              <text x={x + barWidth / 2} y={chartHeight + 14} textAnchor="middle" fontSize="9" fill="#737373">
                {label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

const RESULT_LABEL: Record<string, string> = { pending: "Offen", won: "Gewonnen", lost: "Verloren", push: "Rückgabe" };
function resultTone(status: string): "gold" | "neutral" | "green" | "red" {
  if (status === "won") return "green";
  if (status === "lost") return "red";
  if (status === "pending") return "gold";
  return "neutral";
}
function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "–";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "–";
  return `${date.toLocaleDateString("de-DE")} · ${date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr`;
}

function TipsTable({ tips }: { tips: FootballTip[] }) {
  const router = useRouter();
  if (tips.length === 0) return <p className="text-sm text-neutral-400">Keine Tipps gefunden.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] text-left text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500">
            <th className="py-2 pr-4 font-medium">Anstoß</th>
            <th className="py-2 pr-4 font-medium">Spiel</th>
            <th className="py-2 pr-4 font-medium">Quote</th>
            <th className="py-2 pr-4 font-medium">Ergebnis</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {tips.map((t) => (
            <tr
              key={`${t.phase_two_scan_run_id}-${t.fixture_id}`}
              onClick={() => router.push(`/football/matches/${encodeURIComponent(t.fixture_id)}`)}
              className="cursor-pointer hover:bg-neutral-50"
            >
              <td className="py-2 pr-4 whitespace-nowrap text-neutral-500">{formatDateTime(t.kickoff)}</td>
              <td className="py-2 pr-4 font-medium text-neutral-900">
                {t.home_team_name} – {t.away_team_name}
              </td>
              <td className="py-2 pr-4 text-neutral-500">{t.market_odds ? t.market_odds.toFixed(2) : "–"}</td>
              <td className="py-2 pr-4">
                <Badge tone={resultTone(t.result_status)}>{RESULT_LABEL[t.result_status] ?? t.result_status}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
