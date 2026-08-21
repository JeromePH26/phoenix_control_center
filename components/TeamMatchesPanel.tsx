"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import Badge from "@/components/ui/Badge";
import DataTable, { Column } from "@/components/ui/DataTable";
import InfoTooltip from "@/components/ui/InfoTooltip";
import type { FootballMatch, FootballTip } from "@/lib/types";

const inputClass =
  "rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm text-neutral-900 focus:border-phoenix-gold focus:outline-none focus:ring-1 focus:ring-phoenix-gold";

const MATCH_STATUS_LABEL: Record<string, string> = {
  TBD: "Termin steht noch nicht fest",
  NS: "Noch nicht begonnen",
  "1H": "1. Halbzeit läuft",
  HT: "Halbzeitpause",
  "2H": "2. Halbzeit läuft",
  ET: "Verlängerung läuft",
  BT: "Pause (Verlängerung)",
  P: "Elfmeterschießen läuft",
  SUSP: "Unterbrochen",
  INT: "Unterbrochen",
  LIVE: "Läuft",
  FT: "Beendet",
  AET: "Beendet (nach Verlängerung)",
  PEN: "Beendet (nach Elfmeterschießen)",
  PST: "Verschoben",
  CANC: "Abgesagt",
  ABD: "Abgebrochen",
  AWD: "Am grünen Tisch entschieden",
  WO: "Kampflos gewonnen",
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "–";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "–";
  return `${date.toLocaleDateString("de-DE")} · ${date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr`;
}

type AnalyzedFilter = "" | "yes" | "no";
type HomeAwayFilter = "" | "home" | "away";
type TipFilter = "" | "yes" | "no";

/**
 * Section 15 (Team - Spiele): alle gespeicherten Spiele dieses Teams, real aus
 * GET /api/football/matches?teamId=... (dieselbe Liste wie die Haupt-
 * Spieleseite, nur teamgefiltert). Datum/Analysiert werden serverseitig
 * gefiltert (Backend-Query unterstützt das bereits); Heim/Auswärts und
 * Tipp-vorhanden werden clientseitig auf der geladenen Seite verfeinert, da
 * das Backend dafür keinen eigenen Filterparameter hat - "Saison" gibt es in
 * football_matches nicht als eigenes Feld und bleibt daher unbeantwortbar.
 */
export default function TeamMatchesPanel({ teamId }: { teamId: string }) {
  const router = useRouter();
  const [matches, setMatches] = useState<FootballMatch[]>([]);
  const [tips, setTips] = useState<FootballTip[]>([]);
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading");
  const [date, setDate] = useState("");
  const [analyzed, setAnalyzed] = useState<AnalyzedFilter>("");
  const [homeAway, setHomeAway] = useState<HomeAwayFilter>("");
  const [tipFilter, setTipFilter] = useState<TipFilter>("");

  const load = useCallback(async () => {
    setState("loading");
    const qs = new URLSearchParams();
    qs.set("teamId", teamId);
    if (date) qs.set("date", date);
    if (analyzed) qs.set("hasAnalysis", analyzed === "yes" ? "true" : "false");
    qs.set("limit", "200");
    try {
      const [matchesRes, tipsRes] = await Promise.all([
        fetch(`/api/football/matches?${qs.toString()}`),
        fetch(`/api/football/tips?teamId=${encodeURIComponent(teamId)}&limit=200`),
      ]);
      if (!matchesRes.ok) {
        setState("error");
        return;
      }
      const data = await matchesRes.json().catch(() => null);
      setMatches(Array.isArray(data?.matches) ? data.matches : []);
      if (tipsRes.ok) {
        const tipsData = await tipsRes.json().catch(() => null);
        setTips(Array.isArray(tipsData?.tips) ? tipsData.tips : []);
      }
      setState("loaded");
    } catch {
      setState("error");
    }
  }, [teamId, date, analyzed]);

  useEffect(() => {
    load();
  }, [load]);

  const tippedFixtureIds = useMemo(() => {
    const set = new Set<string>();
    for (const t of tips) {
      if (t.market_key) set.add(t.fixture_id);
    }
    return set;
  }, [tips]);

  const filtered = useMemo(() => {
    return matches.filter((m) => {
      if (homeAway === "home" && m.homeTeam?.id !== teamId) return false;
      if (homeAway === "away" && m.awayTeam?.id !== teamId) return false;
      const hasTip = tippedFixtureIds.has(m.id);
      if (tipFilter === "yes" && !hasTip) return false;
      if (tipFilter === "no" && hasTip) return false;
      return true;
    });
  }, [matches, homeAway, tipFilter, tippedFixtureIds, teamId]);

  const columns: Column<FootballMatch>[] = [
    { header: "Datum", cell: (m) => <span className="whitespace-nowrap text-neutral-500">{formatDate(m.kickoffUtc)}</span> },
    {
      header: "Gegner",
      cell: (m) => {
        const isHome = m.homeTeam?.id === teamId;
        const opponent = isHome ? m.awayTeam?.name : m.homeTeam?.name;
        return opponent ?? "–";
      },
    },
    { header: "Wettbewerb", cell: (m) => m.league?.name ?? "–" },
    {
      header: "Heim/Auswärts",
      cell: (m) => (m.homeTeam?.id === teamId ? "Heim" : m.awayTeam?.id === teamId ? "Auswärts" : "–"),
    },
    {
      header: "Ergebnis",
      cell: (m) =>
        m.homeGoals != null && m.awayGoals != null ? (
          `${m.homeGoals}:${m.awayGoals}`
        ) : (
          <span className="text-neutral-400">{MATCH_STATUS_LABEL[m.status ?? ""] ?? m.status ?? "–"}</span>
        ),
    },
    {
      header: "Analyse",
      cell: (m) => <Badge tone={m.hasAnalysis ? "green" : "neutral"}>{m.hasAnalysis ? "Vorhanden" : "Keine"}</Badge>,
    },
    {
      header: "Tipp",
      cell: (m) => <Badge tone={tippedFixtureIds.has(m.id) ? "green" : "neutral"}>{tippedFixtureIds.has(m.id) ? "Vorhanden" : "Keiner"}</Badge>,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="team-matches-date" className="mb-1 block text-xs font-medium text-neutral-600">
            Datum
          </label>
          <input id="team-matches-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="team-matches-home-away" className="mb-1 block text-xs font-medium text-neutral-600">
            Heim/Auswärts
          </label>
          <select
            id="team-matches-home-away"
            value={homeAway}
            onChange={(e) => setHomeAway(e.target.value as HomeAwayFilter)}
            className={inputClass}
          >
            <option value="">Alle</option>
            <option value="home">Heim</option>
            <option value="away">Auswärts</option>
          </select>
        </div>
        <div>
          <label htmlFor="team-matches-analyzed" className="mb-1 block text-xs font-medium text-neutral-600">
            Analyse
          </label>
          <select
            id="team-matches-analyzed"
            value={analyzed}
            onChange={(e) => setAnalyzed(e.target.value as AnalyzedFilter)}
            className={inputClass}
          >
            <option value="">Alle</option>
            <option value="yes">Analysiert</option>
            <option value="no">Nicht analysiert</option>
          </select>
        </div>
        <div>
          <label htmlFor="team-matches-tip" className="mb-1 flex items-center gap-1 text-xs font-medium text-neutral-600">
            Tipp
            <InfoTooltip text="Ob PHÖNIX für dieses Spiel einen veröffentlichten Tipp abgegeben hat." />
          </label>
          <select id="team-matches-tip" value={tipFilter} onChange={(e) => setTipFilter(e.target.value as TipFilter)} className={inputClass}>
            <option value="">Alle</option>
            <option value="yes">Tipp vorhanden</option>
            <option value="no">Kein Tipp</option>
          </select>
        </div>
      </div>

      {state === "loading" && <p className="text-sm text-neutral-400">Wird geladen…</p>}
      {state === "error" && <p className="text-sm text-red-600">Spiele konnten nicht geladen werden.</p>}
      {state === "loaded" && (
        <DataTable
          columns={columns}
          rows={filtered}
          rowKey={(m) => m.id}
          emptyMessage="Keine Spiele für diese Filter gefunden"
          onRowClick={(m) => router.push(`/football/matches/${encodeURIComponent(m.id)}`)}
        />
      )}
    </div>
  );
}
