"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import InfoTooltip from "@/components/ui/InfoTooltip";
import type { LeagueTeamRow } from "@/lib/types";

type SortKey = "name" | "stored_matches" | "analyzed_matches" | "tips_count" | "hitRatePercent" | "roiPercent";

const SMALL_SAMPLE_THRESHOLD = 5;

function pct(value: number | null): string {
  return value == null ? "–" : `${value.toFixed(1)} %`;
}

export default function LeagueTeamsPanel({ teams }: { teams: LeagueTeamRow[] }) {
  const router = useRouter();
  const [sortKey, setSortKey] = useState<SortKey>("stored_matches");
  const [sortDesc, setSortDesc] = useState(true);

  const sorted = useMemo(() => {
    const copy = [...teams];
    copy.sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name) * (sortDesc ? -1 : 1);
      const av = a[sortKey] ?? -Infinity;
      const bv = b[sortKey] ?? -Infinity;
      return (av - bv) * (sortDesc ? -1 : 1);
    });
    return copy;
  }, [teams, sortKey, sortDesc]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDesc((d) => !d);
    } else {
      setSortKey(key);
      setSortDesc(true);
    }
  }

  function Th({ label, sortable, colKey, info }: { label: string; sortable?: SortKey; colKey?: string; info?: string }) {
    return (
      <th key={colKey ?? label} className="py-2 pr-4 font-medium">
        {sortable ? (
          <button type="button" onClick={() => toggleSort(sortable)} className="inline-flex items-center gap-1 hover:text-neutral-700">
            {label}
            {sortKey === sortable && <span aria-hidden>{sortDesc ? "↓" : "↑"}</span>}
          </button>
        ) : (
          <span className="inline-flex items-center gap-1">{label}</span>
        )}
        {info && <InfoTooltip text={info} />}
      </th>
    );
  }

  if (teams.length === 0) {
    return <p className="py-8 text-center text-sm text-neutral-400">Keine Teams für diese Liga gefunden</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-neutral-400">Klick auf ein Team für Details.</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500">
              <Th label="Team" sortable="name" />
              <Th label="Gespeicherte Spiele" sortable="stored_matches" />
              <Th label="Analysiert" sortable="analyzed_matches" />
              <Th label="PHÖNIX-Tipps" sortable="tips_count" />
              <Th
                label="Trefferquote"
                sortable="hitRatePercent"
                info="Gewonnen / (Gewonnen + Verloren) über alle abgerechneten Tipps dieses Teams - Void/Rückgabe zählt nicht mit."
              />
              <Th label="ROI" sortable="roiPercent" />
              <Th label="Datenqualität" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {sorted.map((t) => {
              const decided = t.won + t.lost;
              const smallSample = decided > 0 && decided < SMALL_SAMPLE_THRESHOLD;
              return (
                <tr
                  key={t.id}
                  onClick={() => router.push(`/football/teams/${encodeURIComponent(t.id)}`)}
                  className="cursor-pointer hover:bg-neutral-50"
                >
                  <td className="py-2.5 pr-4 align-top">
                    <span className="inline-flex items-center gap-2">
                      {t.logo && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={t.logo} alt="" className="h-5 w-5 object-contain" />
                      )}
                      <span className="font-medium text-neutral-900">{t.name}</span>
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 align-top text-neutral-800">{t.stored_matches}</td>
                  <td className="py-2.5 pr-4 align-top text-neutral-800">{t.analyzed_matches}</td>
                  <td className="py-2.5 pr-4 align-top text-neutral-800">{t.tips_count}</td>
                  <td className="py-2.5 pr-4 align-top text-neutral-800">
                    {pct(t.hitRatePercent)}
                    {smallSample && (
                      <span className="ml-1 text-amber-600" title="Geringe Datenbasis">
                        ⚠
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 pr-4 align-top text-neutral-800">{pct(t.roiPercent)}</td>
                  <td className="py-2.5 pr-4 align-top text-neutral-800">{t.avg_data_quality == null ? "–" : `${t.avg_data_quality} %`}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
