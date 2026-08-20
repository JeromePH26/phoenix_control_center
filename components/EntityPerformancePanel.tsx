"use client";

import { useMemo, useState } from "react";
import Badge from "@/components/ui/Badge";
import InfoTooltip from "@/components/ui/InfoTooltip";
import type { FootballTip } from "@/lib/types";

type GroupBy = "week" | "month" | "year";

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

function isoWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function periodKey(iso: string | null | undefined, groupBy: GroupBy): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  if (groupBy === "year") return String(date.getFullYear());
  if (groupBy === "month") return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  return isoWeekKey(date);
}

interface Bucket {
  period: string;
  won: number;
  lost: number;
  push: number;
  pending: number;
}

/**
 * Shows real win/loss performance for a set of tips (a team or a league),
 * computed client-side from the same /api/football/tips rows the Tipps page
 * uses - no separate backend aggregation, so it can never drift from what's
 * actually shown there. All numbers come from result_status; nothing here is
 * estimated or mocked.
 */
export default function EntityPerformancePanel({ tips }: { tips: FootballTip[] }) {
  const [groupBy, setGroupBy] = useState<GroupBy>("month");

  const overall = useMemo(() => {
    let won = 0;
    let lost = 0;
    let push = 0;
    let pending = 0;
    for (const t of tips) {
      if (t.result_status === "won") won++;
      else if (t.result_status === "lost") lost++;
      else if (t.result_status === "push") push++;
      else pending++;
    }
    const decided = won + lost;
    const winPercent = decided > 0 ? Math.round((won / decided) * 1000) / 10 : null;
    return { won, lost, push, pending, winPercent, total: tips.length };
  }, [tips]);

  const buckets = useMemo(() => {
    const map = new Map<string, Bucket>();
    for (const t of tips) {
      const key = periodKey(t.kickoff, groupBy);
      if (!key) continue;
      const bucket = map.get(key) ?? { period: key, won: 0, lost: 0, push: 0, pending: 0 };
      if (t.result_status === "won") bucket.won++;
      else if (t.result_status === "lost") bucket.lost++;
      else if (t.result_status === "push") bucket.push++;
      else bucket.pending++;
      map.set(key, bucket);
    }
    return Array.from(map.values()).sort((a, b) => a.period.localeCompare(b.period));
  }, [tips, groupBy]);

  const marketBreakdown = useMemo(() => {
    const map = new Map<string, { won: number; lost: number; push: number; pending: number }>();
    for (const t of tips) {
      if (!t.market_key) continue;
      const entry = map.get(t.market_key) ?? { won: 0, lost: 0, push: 0, pending: 0 };
      if (t.result_status === "won") entry.won++;
      else if (t.result_status === "lost") entry.lost++;
      else if (t.result_status === "push") entry.push++;
      else entry.pending++;
      map.set(t.market_key, entry);
    }
    return Array.from(map.entries())
      .map(([market, e]) => {
        const decided = e.won + e.lost;
        return {
          market,
          ...e,
          winPercent: decided > 0 ? Math.round((e.won / decided) * 1000) / 10 : null,
        };
      })
      .sort((a, b) => b.won + b.lost + b.push + b.pending - (a.won + a.lost + a.push + a.pending));
  }, [tips]);

  const chartWidth = 640;
  const chartHeight = 140;
  const barGap = 6;
  const barWidth = buckets.length > 0 ? Math.max(8, chartWidth / buckets.length - barGap) : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <div className="rounded-md border border-neutral-100 bg-neutral-50 px-3 py-2.5">
          <p className="text-xs text-neutral-500">Analysen gesamt</p>
          <p className="mt-0.5 text-xl font-semibold text-neutral-900">{overall.total}</p>
        </div>
        <div className="rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2.5">
          <p className="text-xs text-neutral-500">Gewonnen</p>
          <p className="mt-0.5 text-xl font-semibold text-emerald-700">{overall.won}</p>
        </div>
        <div className="rounded-md border border-red-100 bg-red-50 px-3 py-2.5">
          <p className="text-xs text-neutral-500">Verloren</p>
          <p className="mt-0.5 text-xl font-semibold text-red-700">{overall.lost}</p>
        </div>
        <div className="rounded-md border border-neutral-100 bg-neutral-50 px-3 py-2.5">
          <p className="text-xs text-neutral-500">Offen</p>
          <p className="mt-0.5 text-xl font-semibold text-neutral-900">{overall.pending}</p>
        </div>
        <div className="rounded-md border border-phoenix-gold/30 bg-phoenix-gold/10 px-3 py-2.5">
          <p className="flex items-center gap-1 text-xs text-neutral-500">
            Trefferquote
            <InfoTooltip text="Gewonnene Analysen geteilt durch entschiedene Analysen (gewonnen + verloren). Offene und Rückgabe-Fälle zählen nicht mit." />
          </p>
          <p className="mt-0.5 text-xl font-semibold text-neutral-900">
            {overall.winPercent === null ? "–" : `${overall.winPercent} %`}
          </p>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium text-neutral-700">Performance im Zeitverlauf</p>
          <div className="flex gap-1">
            {(["week", "month", "year"] as GroupBy[]).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGroupBy(g)}
                className={`rounded-md border px-2.5 py-1 text-xs font-medium ${
                  groupBy === g
                    ? "border-phoenix-gold bg-phoenix-gold/10 text-phoenix-gold-dark"
                    : "border-neutral-300 text-neutral-600 hover:bg-neutral-50"
                }`}
              >
                {g === "week" ? "Woche" : g === "month" ? "Monat" : "Jahr"}
              </button>
            ))}
          </div>
        </div>
        {buckets.length === 0 ? (
          <p className="text-sm text-neutral-400">Noch keine Daten für diesen Zeitraum.</p>
        ) : (
          <div className="overflow-x-auto">
            <svg width={Math.max(chartWidth, buckets.length * (barWidth + barGap))} height={chartHeight + 40}>
              {buckets.map((b, i) => {
                const decided = b.won + b.lost;
                const pct = decided > 0 ? b.won / decided : 0;
                const barHeight = decided > 0 ? Math.max(2, pct * chartHeight) : 2;
                const x = i * (barWidth + barGap);
                return (
                  <g key={b.period}>
                    <title>
                      {b.period}: {b.won} gewonnen, {b.lost} verloren
                      {decided > 0 ? ` (${Math.round(pct * 1000) / 10} %)` : " (noch offen)"}
                    </title>
                    <rect
                      x={x}
                      y={chartHeight - barHeight}
                      width={barWidth}
                      height={barHeight}
                      fill={decided === 0 ? "#e5e5e5" : pct >= 0.5 ? "#10b981" : "#ef4444"}
                      rx={2}
                    />
                    <text
                      x={x + barWidth / 2}
                      y={chartHeight + 14}
                      textAnchor="middle"
                      fontSize="9"
                      fill="#737373"
                      transform={buckets.length > 12 ? `rotate(45 ${x + barWidth / 2} ${chartHeight + 14})` : undefined}
                    >
                      {b.period}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        )}
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-neutral-700">Performance je Markt</p>
        {marketBreakdown.length === 0 ? (
          <p className="text-sm text-neutral-400">Keine Marktdaten vorhanden.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500">
                  <th className="py-2 pr-4 font-medium">Markt</th>
                  <th className="py-2 pr-4 font-medium">Gewonnen</th>
                  <th className="py-2 pr-4 font-medium">Verloren</th>
                  <th className="py-2 pr-4 font-medium">Offen</th>
                  <th className="py-2 pr-4 font-medium">Trefferquote</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {marketBreakdown.map((m) => (
                  <tr key={m.market}>
                    <td className="py-2 pr-4 font-medium text-neutral-900">{marketLabel(m.market)}</td>
                    <td className="py-2 pr-4 text-emerald-700">{m.won}</td>
                    <td className="py-2 pr-4 text-red-700">{m.lost}</td>
                    <td className="py-2 pr-4 text-neutral-500">{m.pending}</td>
                    <td className="py-2 pr-4">
                      {m.winPercent === null ? (
                        "–"
                      ) : (
                        <Badge tone={m.winPercent >= 50 ? "green" : "red"}>{m.winPercent} %</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
