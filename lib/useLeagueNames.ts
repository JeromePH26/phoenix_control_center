"use client";

import { useEffect, useState } from "react";

/**
 * League IDs (e.g. "79", "140") are meaningless to a normal employee - every
 * place that shows a league must show its full name instead. This hook
 * fetches the league list once per page load (module-level cache, shared
 * across every component that uses it) and exposes a leagueId -> name
 * lookup. Falls back to "Liga {id}" (never the bare number alone) while
 * loading or if a given id isn't found, and to "Global" for GLOBAL-scope
 * rows (no league at all, e.g. a bootstrap Model Lab champion).
 */

let cache: Record<string, string> | null = null;
let inFlight: Promise<Record<string, string>> | null = null;

async function loadLeagueNames(): Promise<Record<string, string>> {
  if (cache) return cache;
  if (!inFlight) {
    inFlight = fetch("/api/football/leagues")
      .then((res) => (res.ok ? res.json() : { leagues: [] }))
      .then((data) => {
        const leagues: Array<{ leagueId?: string; league_id?: string; name?: string }> = Array.isArray(
          data?.leagues
        )
          ? data.leagues
          : Array.isArray(data)
            ? data
            : [];
        const map: Record<string, string> = {};
        for (const l of leagues) {
          const id = l.leagueId ?? l.league_id;
          if (id && l.name) map[String(id)] = l.name;
        }
        cache = map;
        return map;
      })
      .catch(() => ({}) as Record<string, string>);
  }
  return inFlight;
}

export function useLeagueNames(): {
  leagueName: (leagueId: string | null | undefined) => string;
  loaded: boolean;
} {
  const [names, setNames] = useState<Record<string, string> | null>(cache);

  useEffect(() => {
    if (cache) return;
    let cancelled = false;
    loadLeagueNames().then((map) => {
      if (!cancelled) setNames(map);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function leagueName(leagueId: string | null | undefined): string {
    if (!leagueId) return "Global";
    if (!names) return `Liga ${leagueId}`;
    return names[leagueId] ?? `Liga ${leagueId}`;
  }

  return { leagueName, loaded: names !== null };
}
