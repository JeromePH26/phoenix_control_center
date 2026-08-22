"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Badge from "@/components/ui/Badge";
import InfoTooltip from "@/components/ui/InfoTooltip";
import type {
  FootballTip,
  PerformanceAggregateResponse,
  PerformanceByMarket,
  PerformanceByTeam,
  PerformanceTimeSeriesPoint,
} from "@/lib/types";

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
  // Liga-Profile starten bewusst mit dem vollständigen Tippverlauf. So
  // verschwindet kein älterer Tipp still aus dem Diagramm.
  const [period, setPeriod] = useState<Period>("all");
  const [metric, setMetric] = useState<Metric>("tipCount");
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

  // periodRange() calls `new Date()` internally, so it must be memoized -
  // recomputing it every render produces a new from/to string each time,
  // which (via load's dependency array below) retriggers the load effect
  // every render and floods the backend with requests indefinitely.
  const { from, to } = useMemo(() => periodRange(period, customFrom, customTo), [period, customFrom, customTo]);

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
    if (leagueId && !teamId) qs.set("includeTeamBreakdown", "true");
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
    const focusedMarketLabel = data?.byMarket?.find((m) => m.marketKey === focusedMarket)?.marketLabel ?? marketLabel(focusedMarket);
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setFocusedMarket(null)}
          className="text-xs text-phoenix-gold-dark hover:underline"
        >
          ← Zurück zur Marktübersicht
        </button>
        <h3 className="text-lg font-semibold text-neutral-900">{focusedMarketLabel}</h3>
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
              <p className="-mt-3 text-xs text-neutral-500">
                {summary.withTip} PHÖNIX-Tipps im gewählten Zeitraum · im Diagramm nach Zeitabschnitten zusammengefasst
              </p>
              {(data?.timeSeries?.length ?? 0) === 0 ? (
                <p className="text-sm text-neutral-400">Für diesen Zeitraum liegen noch nicht genügend Daten vor.</p>
              ) : (
                <Chart series={data!.timeSeries!} metric={metric} />
              )}
              {leagueId && !teamId && <LeagueTeamRanking rows={data?.byTeam ?? []} />}
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
                        <td className="py-2 pr-4 font-medium text-neutral-900">{m.marketLabel || marketLabel(m.marketKey)}</td>
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
          {summary.withTip} PHÖNIX-Tipps · {summary.won + summary.lost} entschieden · {summary.push} Rückgabe · {summary.pending} offen ·{" "}
          {summary.sampleSize} Analysen gesamt
          {isSmallSample && " · geringe Datenbasis"}
        </p>
      </div>
    </div>
  );
}

function LeagueTeamRanking({ rows }: { rows: PerformanceByTeam[] }) {
  if (rows.length === 0) return null;
  return (
    <div className="rounded-lg border border-neutral-200 bg-white">
      <div className="border-b border-neutral-100 px-4 py-3">
        <p className="text-sm font-semibold text-neutral-900">Team-Rangliste</p>
        <p className="mt-0.5 text-xs text-neutral-500">
          Jeder Tipp wird beiden beteiligten Teams zugeordnet; die Rangfolge folgt Gewinn/Verlust in Units.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 text-[11px] uppercase tracking-wide text-neutral-500">
              <th className="w-12 px-4 py-2.5 font-medium">#</th>
              <th className="px-3 py-2.5 font-medium">Mannschaft</th>
              <th className="px-3 py-2.5 text-center font-medium">Tipps</th>
              <th className="px-3 py-2.5 text-center font-medium">Gew.</th>
              <th className="px-3 py-2.5 text-center font-medium">Zurück</th>
              <th className="px-3 py-2.5 text-center font-medium">Verl.</th>
              <th className="px-3 py-2.5 text-center font-medium">Offen</th>
              <th className="px-3 py-2.5 text-center font-medium">Quote</th>
              <th className="px-4 py-2.5 text-right font-medium">Ertrag</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {rows.map((row, index) => (
              <tr key={row.teamId} className="hover:bg-neutral-50">
                <td className="px-4 py-2.5 font-semibold text-neutral-400">{index + 1}</td>
                <td className="px-3 py-2.5 font-medium text-neutral-900">
                  <span className="flex items-center gap-2">
                    {row.teamLogo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={row.teamLogo} alt="" className="h-5 w-5 object-contain" />
                    ) : (
                      <span className="h-5 w-5 rounded-full bg-neutral-100" />
                    )}
                    {row.teamName}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-center text-neutral-700">{row.tipCount}</td>
                <td className="px-3 py-2.5 text-center font-medium text-emerald-700">{row.won}</td>
                <td className="px-3 py-2.5 text-center text-neutral-500">{row.push}</td>
                <td className="px-3 py-2.5 text-center font-medium text-red-600">{row.lost}</td>
                <td className="px-3 py-2.5 text-center text-amber-700">{row.pending}</td>
                <td className="px-3 py-2.5 text-center text-neutral-500">{row.avgOdds == null ? "–" : row.avgOdds.toFixed(2)}</td>
                <td className={`px-4 py-2.5 text-right font-semibold ${row.profitUnits >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                  {row.profitUnits >= 0 ? "+" : ""}{row.profitUnits.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Linienchart mit Skala, Raster und Datenpunkten. Anders als der frühere
 * Balken zeigt er den Tippverlauf vollständig und bleibt auch bei Pending-
 * Tipps aussagekräftig, wenn "Anzahl Tipps" gewählt ist. */
function Chart({ series, metric }: { series: PerformanceTimeSeriesPoint[]; metric: Metric }) {
  const points = series ?? [];
  if (points.length === 0) return <p className="text-sm text-neutral-400">Für diesen Zeitraum liegen noch nicht genügend Daten vor.</p>;

  const signed = new Set<Metric>(["roiPercent", "yieldPercent", "profitUnits", "avgValuePercent"]);
  const isSigned = signed.has(metric);
  const values = points.map((p) => (typeof p[metric] === "number" ? (p[metric] as number) : null));
  const finiteValues = values.filter((v): v is number => v !== null);
  const maxValue = Math.max(...finiteValues, isSigned ? 0 : 1);
  const minValue = isSigned ? Math.min(...finiteValues, 0) : 0;
  const range = Math.max(maxValue - minValue, 1);
  const width = Math.max(680, points.length * 84);
  const height = 228;
  const left = 48;
  const right = 18;
  const top = 18;
  const bottom = 44;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const xFor = (index: number) => left + (points.length === 1 ? plotWidth / 2 : (index * plotWidth) / (points.length - 1));
  const yFor = (value: number) => top + ((maxValue - value) / range) * plotHeight;
  const linePoints = values
    .map((value, index) => (value === null ? null : `${xFor(index)},${yFor(value)}`))
    .filter((value): value is string => value !== null)
    .join(" ");
  const tickValues = Array.from({ length: 5 }, (_, index) => maxValue - (range * index) / 4);

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between px-1">
        <p className="text-sm font-semibold text-neutral-900">{METRIC_LABEL[metric]} im Zeitverlauf</p>
        <span className="inline-flex items-center gap-1.5 text-xs text-neutral-500"><span className="h-2 w-2 rounded-full bg-phoenix-gold" />{points.length} Zeitabschnitte</span>
      </div>
      <div className="overflow-x-auto">
        <svg width={width} height={height} role="img" aria-label={`${METRIC_LABEL[metric]} als Zeitverlauf`}>
          {tickValues.map((tick) => {
            const y = yFor(tick);
            return (
              <g key={tick}>
                <line x1={left} y1={y} x2={width - right} y2={y} stroke="#e5e7eb" strokeWidth={1} />
                <text x={left - 8} y={y + 3} textAnchor="end" fontSize="10" fill="#737373">{formatMetricValue(metric, tick)}</text>
              </g>
            );
          })}
          {isSigned && minValue < 0 && maxValue > 0 && (
            <line x1={left} y1={yFor(0)} x2={width - right} y2={yFor(0)} stroke="#a3a3a3" strokeWidth={1.25} />
          )}
          {linePoints && <polyline points={linePoints} fill="none" stroke="#0D9488" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />}
          {points.map((point, index) => {
            const value = values[index];
            const labelDate = new Date(point.period);
            const label = Number.isNaN(labelDate.getTime()) ? point.period : labelDate.toLocaleDateString("de-DE", { month: "short", year: "2-digit" });
            const x = xFor(index);
            return (
              <g key={point.period}>
                {value !== null && <><title>{`${label}: ${formatMetricValue(metric, value)}`}</title><circle cx={x} cy={yFor(value)} r={3.5} fill="#0D9488" stroke="#ffffff" strokeWidth={1.5} /></>}
                <text x={x} y={height - 14} textAnchor="end" transform={`rotate(-36 ${x} ${height - 14})`} fontSize="10" fill="#737373">{label}</text>
              </g>
            );
          })}
        </svg>
      </div>
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
