"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Badge from "@/components/ui/Badge";
import InfoTooltip from "@/components/ui/InfoTooltip";
import { LEAGUE_MARKET_STATUS_LABEL, type LeagueLearningOverview, type LeagueMarketStatus } from "@/lib/types";

function statusTone(status: string): "gold" | "neutral" | "green" | "red" {
  if (status === "CHAMPION_ACTIVE") return "green";
  if (status === "SHADOW_ACTIVE" || status === "CHALLENGER_READY") return "gold";
  if (status === "NOT_ENOUGH_DATA") return "red";
  return "neutral";
}

function statusLabel(status: string): string {
  return LEAGUE_MARKET_STATUS_LABEL[status as LeagueMarketStatus] ?? status;
}

export default function LeagueLearningPanel({ leagueId }: { leagueId: string }) {
  const [data, setData] = useState<LeagueLearningOverview | null>(null);
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    fetch(`/api/model-lab/leagues/${encodeURIComponent(leagueId)}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((json: LeagueLearningOverview) => {
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
  }, [leagueId]);

  if (state === "loading") return <p className="text-sm text-neutral-400">Wird geladen…</p>;
  if (state === "error" || !data) {
    return <p className="text-sm text-neutral-400">Learning-Status konnte nicht geladen werden.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-neutral-500">
        <span>Gespeicherte Spiele: <span className="font-medium text-neutral-900">{data.storedMatches}</span></span>
        <span>Abgerechnet: <span className="font-medium text-neutral-900">{data.settledMatches}</span></span>
        <span>
          <span className="inline-flex items-center gap-1">
            Für Learning geeignet
            <InfoTooltip text="Anzahl abgerechneter Spiele, die die Mindestanforderungen für das Model-Lab-Training erfüllen (z.B. echte Marktquote vorhanden)." />
          </span>
          : <span className="font-medium text-neutral-900">{data.eligibleMatches}</span>
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500">
              <th className="py-2 pr-4 font-medium">Markt</th>
              <th className="py-2 pr-4 font-medium">Status</th>
              <th className="py-2 pr-4 font-medium">Samples</th>
              <th className="py-2 pr-4 font-medium">Champion</th>
              <th className="py-2 pr-4 font-medium">Bester Herausforderer</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {data.markets.map((m) => (
              <tr key={m.market}>
                <td className="py-2.5 pr-4 align-top text-neutral-800">{m.marketLabel}</td>
                <td className="py-2.5 pr-4 align-top">
                  <Badge tone={statusTone(m.status)}>{statusLabel(m.status)}</Badge>
                </td>
                <td className="py-2.5 pr-4 align-top text-neutral-800">{m.sampleSize}</td>
                <td className="py-2.5 pr-4 align-top">
                  {m.champion ? (
                    <Link href={`/model-lab/models/${m.champion.id}`} className="text-phoenix-gold-dark hover:underline">
                      {m.champion.readableVersion}
                    </Link>
                  ) : (
                    <span className="text-neutral-400">Globales Modell</span>
                  )}
                </td>
                <td className="py-2.5 pr-4 align-top">
                  {m.bestChallenger ? (
                    <Link href={`/model-lab/models/${m.bestChallenger.id}`} className="text-phoenix-gold-dark hover:underline">
                      {m.bestChallenger.readableVersion}
                      {m.challengerCount > 1 && <span className="ml-1 text-neutral-400">(+{m.challengerCount - 1})</span>}
                    </Link>
                  ) : (
                    <span className="text-neutral-400">–</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
