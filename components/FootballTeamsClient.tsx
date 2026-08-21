"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import Badge from "@/components/ui/Badge";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import DataTable, { Column } from "@/components/ui/DataTable";
import InfoTooltip from "@/components/ui/InfoTooltip";
import StateMessage from "@/components/ui/StateMessage";
import type { FootballLeague, FootballTeamProfile } from "@/lib/types";

type LoadState = "loading" | "loaded" | "unreachable" | "error";

const PAGE_SIZE = 50;

const inputClass =
  "rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm text-neutral-900 focus:border-phoenix-gold focus:outline-none focus:ring-1 focus:ring-phoenix-gold";

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "name", label: "Name" },
  { value: "league", label: "Liga" },
  { value: "hitRate", label: "Trefferquote" },
  { value: "roi", label: "ROI" },
  { value: "tips", label: "Anzahl Tipps" },
  { value: "coverage", label: "Datenabdeckung" },
];

function pct(value: number | null | undefined): string {
  if (value === null || value === undefined) return "–";
  return `${Math.round(value * 10) / 10} %`;
}
function signedPct(value: number | null | undefined): string {
  if (value === null || value === undefined) return "–";
  const rounded = Math.round(value * 10) / 10;
  return `${rounded >= 0 ? "+" : ""}${rounded} %`;
}

export default function FootballTeamsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const search = searchParams.get("search") ?? "";
  const offset = Number(searchParams.get("offset") ?? "0") || 0;
  const leagueId = searchParams.get("leagueId") ?? "";
  const country = searchParams.get("country") ?? "";
  const activeStatus = searchParams.get("activeStatus") ?? "";
  const dataStatus = searchParams.get("dataStatus") ?? "";
  const logoStatus = searchParams.get("logoStatus") ?? "";
  const analysesStatus = searchParams.get("analysesStatus") ?? "";
  const tipsStatus = searchParams.get("tipsStatus") ?? "";
  const sortBy = searchParams.get("sortBy") ?? "name";
  const sortDir = searchParams.get("sortDir") ?? "asc";

  const [teams, setTeams] = useState<FootballTeamProfile[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [leagues, setLeagues] = useState<FootballLeague[]>([]);

  useEffect(() => {
    fetch("/api/football/leagues")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const list: FootballLeague[] = Array.isArray(data) ? data : (data?.leagues ?? []);
        setLeagues(list);
      })
      .catch(() => {});
  }, []);

  const countries = useMemo(() => {
    const set = new Set<string>();
    for (const l of leagues) {
      if (typeof l.country === "string" && l.country) set.add(l.country);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "de"));
  }, [leagues]);

  const load = useCallback(async () => {
    setState("loading");
    const qs = new URLSearchParams();
    if (search) qs.set("search", search);
    if (leagueId) qs.set("leagueId", leagueId);
    if (country) qs.set("country", country);
    if (activeStatus) qs.set("activeStatus", activeStatus);
    if (dataStatus) qs.set("dataStatus", dataStatus);
    if (logoStatus) qs.set("logoStatus", logoStatus);
    if (analysesStatus) qs.set("analysesStatus", analysesStatus);
    if (tipsStatus) qs.set("tipsStatus", tipsStatus);
    qs.set("sortBy", sortBy);
    qs.set("sortDir", sortDir);
    qs.set("limit", String(PAGE_SIZE));
    qs.set("offset", String(offset));
    try {
      const res = await fetch(`/api/football/teams?${qs.toString()}`);
      if (res.status === 502) {
        setState("unreachable");
        return;
      }
      if (!res.ok) {
        setState("error");
        return;
      }
      const data = await res.json().catch(() => null);
      setTeams(Array.isArray(data?.teams) ? data.teams : []);
      setCount(typeof data?.total === "number" ? data.total : null);
      setState("loaded");
    } catch {
      setState("unreachable");
    }
  }, [search, offset, leagueId, country, activeStatus, dataStatus, logoStatus, analysesStatus, tipsStatus, sortBy, sortDir]);

  useEffect(() => {
    load();
  }, [load]);

  function updateParam(key: string, value: string) {
    const qs = new URLSearchParams(searchParams.toString());
    if (value) qs.set(key, value);
    else qs.delete(key);
    qs.delete("offset");
    router.replace(`/football/teams${qs.toString() ? `?${qs.toString()}` : ""}`);
  }

  function goToOffset(next: number) {
    const qs = new URLSearchParams(searchParams.toString());
    if (next > 0) qs.set("offset", String(next));
    else qs.delete("offset");
    router.replace(`/football/teams${qs.toString() ? `?${qs.toString()}` : ""}`);
  }

  const hasActiveFilters =
    !!leagueId || !!country || !!activeStatus || !!dataStatus || !!logoStatus || !!analysesStatus || !!tipsStatus;

  function resetFilters() {
    router.replace("/football/teams");
  }

  const columns: Column<FootballTeamProfile>[] = [
    { header: "Team", cell: (t) => <span className="font-medium text-neutral-900">{t.name}</span> },
    { header: "Land", cell: (t) => t.country || "–" },
    { header: "Liga", cell: (t) => t.league_name || "–" },
    {
      header: "Trefferquote",
      info: "Nur ausgewertete (settled) Tipps, offene Tipps zählen nicht mit.",
      cell: (t) => pct(t.hit_rate_percent),
    },
    { header: "ROI", cell: (t) => signedPct(t.roi_percent) },
    { header: "Tipps", cell: (t) => t.tips_count ?? 0 },
    {
      header: "Datenabdeckung",
      info: "Anteil der gespeicherten Spiele dieses Teams, die bereits von PHÖNIX analysiert wurden.",
      cell: (t) => pct(t.coverage_percent),
    },
    {
      header: "Logo",
      cell: (t) => <Badge tone={t.has_logo ? "green" : "neutral"}>{t.has_logo ? "Vorhanden" : "Fehlt"}</Badge>,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Breadcrumbs items={[{ label: "Teams" }]} />
        <h1 className="flex items-center gap-1.5 text-xl font-semibold text-neutral-900">
          Teams
          <InfoTooltip text="Alle Fußball-Mannschaften, die in gespeicherten Spielen vorkommen. Klick auf ein Team für Analysen, Performance und Wappen." />
        </h1>
        <p className="text-sm text-neutral-400">Team-Übersicht mit Analysen, Performance und Wappen-Verwaltung.</p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="team-search" className="mb-1 block text-xs font-medium text-neutral-600">
            Team suchen…
          </label>
          <input
            id="team-search"
            defaultValue={search}
            className={`${inputClass} w-64`}
            onBlur={(e) => updateParam("search", e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") updateParam("search", (e.target as HTMLInputElement).value);
            }}
          />
        </div>
        <div>
          <label htmlFor="team-league" className="mb-1 block text-xs font-medium text-neutral-600">
            Liga
          </label>
          <select id="team-league" value={leagueId} onChange={(e) => updateParam("leagueId", e.target.value)} className={inputClass}>
            <option value="">Alle</option>
            {leagues.map((l) => (
              <option key={l.leagueId} value={l.leagueId}>
                {l.name ?? l.leagueId}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="team-country" className="mb-1 block text-xs font-medium text-neutral-600">
            Land
          </label>
          <select id="team-country" value={country} onChange={(e) => updateParam("country", e.target.value)} className={inputClass}>
            <option value="">Alle</option>
            {countries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="team-active" className="mb-1 block text-xs font-medium text-neutral-600">
            Status
          </label>
          <select id="team-active" value={activeStatus} onChange={(e) => updateParam("activeStatus", e.target.value)} className={inputClass}>
            <option value="">Alle</option>
            <option value="active">Aktiv</option>
            <option value="inactive">Inaktiv</option>
          </select>
        </div>
        <div>
          <label htmlFor="team-data" className="mb-1 block text-xs font-medium text-neutral-600">
            Daten
          </label>
          <select id="team-data" value={dataStatus} onChange={(e) => updateParam("dataStatus", e.target.value)} className={inputClass}>
            <option value="">Alle</option>
            <option value="present">Vorhanden</option>
            <option value="partial">Teilweise</option>
            <option value="missing">Fehlen</option>
          </select>
        </div>
        <div>
          <label htmlFor="team-logo" className="mb-1 block text-xs font-medium text-neutral-600">
            Logo
          </label>
          <select id="team-logo" value={logoStatus} onChange={(e) => updateParam("logoStatus", e.target.value)} className={inputClass}>
            <option value="">Alle</option>
            <option value="present">Vorhanden</option>
            <option value="missing">Fehlt</option>
          </select>
        </div>
        <div>
          <label htmlFor="team-analyses" className="mb-1 block text-xs font-medium text-neutral-600">
            Analysen
          </label>
          <select
            id="team-analyses"
            value={analysesStatus}
            onChange={(e) => updateParam("analysesStatus", e.target.value)}
            className={inputClass}
          >
            <option value="">Alle</option>
            <option value="present">Vorhanden</option>
            <option value="missing">Keine Analysen</option>
          </select>
        </div>
        <div>
          <label htmlFor="team-tips" className="mb-1 block text-xs font-medium text-neutral-600">
            Tipps
          </label>
          <select id="team-tips" value={tipsStatus} onChange={(e) => updateParam("tipsStatus", e.target.value)} className={inputClass}>
            <option value="">Alle</option>
            <option value="present">Vorhanden</option>
            <option value="missing">Keine Tipps</option>
          </select>
        </div>
        <div>
          <label htmlFor="team-sort" className="mb-1 block text-xs font-medium text-neutral-600">
            Sortierung
          </label>
          <div className="flex gap-1">
            <select id="team-sort" value={sortBy} onChange={(e) => updateParam("sortBy", e.target.value)} className={inputClass}>
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <select
              value={sortDir}
              onChange={(e) => updateParam("sortDir", e.target.value)}
              className={inputClass}
              aria-label="Sortierrichtung"
            >
              <option value="asc">Aufsteigend</option>
              <option value="desc">Absteigend</option>
            </select>
          </div>
        </div>
        {hasActiveFilters && (
          <Button variant="secondary" onClick={resetFilters}>
            Filter zurücksetzen
          </Button>
        )}
      </div>

      <Card>
        {state === "loading" && <p className="py-8 text-center text-sm text-neutral-400">Wird geladen…</p>}
        {state === "unreachable" && (
          <StateMessage
            title="PHÖNIX Backend nicht erreichbar"
            description="Die Verbindung zum Backend konnte nicht hergestellt werden."
          />
        )}
        {state === "error" && (
          <StateMessage title="Teams konnten nicht geladen werden" description="Ein unerwarteter Fehler ist aufgetreten." />
        )}
        {state === "loaded" && (
          <>
            <DataTable
              columns={columns}
              rows={teams}
              rowKey={(t) => t.id}
              emptyMessage={hasActiveFilters || search ? "Keine Teams für diese Filter gefunden" : "Keine Teams gefunden"}
              onRowClick={(t) => router.push(`/football/teams/${encodeURIComponent(t.id)}`)}
            />
            {teams.length > 0 && (
              <div className="mt-3 flex items-center justify-between text-xs text-neutral-400">
                <span>
                  {count != null ? `${offset + 1}–${offset + teams.length} von ${count}` : `${teams.length} Einträge`}
                </span>
                <div className="flex gap-2">
                  <Button variant="secondary" disabled={offset === 0} onClick={() => goToOffset(Math.max(0, offset - PAGE_SIZE))}>
                    Zurück
                  </Button>
                  <Button variant="secondary" disabled={teams.length < PAGE_SIZE} onClick={() => goToOffset(offset + PAGE_SIZE)}>
                    Weiter
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
