"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import DataTable, { Column } from "@/components/ui/DataTable";
import EntityAutocomplete, { AutocompleteOption } from "@/components/ui/EntityAutocomplete";
import InfoTooltip from "@/components/ui/InfoTooltip";
import LoadingState from "@/components/ui/LoadingState";
import Pagination from "@/components/ui/Pagination";
import StateMessage from "@/components/ui/StateMessage";
import type { FootballLeague, FootballMatch, FootballTeamProfile } from "@/lib/types";

type LoadState = "loading" | "loaded" | "unreachable" | "error";

const PAGE_SIZE = 50;

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
function matchStatusLabel(status: string): string {
  return MATCH_STATUS_LABEL[status] ?? status;
}

function formatUpdatedAt(iso: string | null | undefined): string {
  if (!iso) return "–";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "–";
  const datePart = date.toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" });
  const timePart = date.toLocaleTimeString("de-DE", { timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit" });
  return `${datePart} · ${timePart} Uhr`;
}

const inputClass =
  "rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-900 focus:border-phoenix-gold focus:outline-none focus:ring-1 focus:ring-phoenix-gold";

function BoolSelect({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-neutral-600">
        {label}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
        <option value="">Alle</option>
        <option value="true">Ja</option>
        <option value="false">Nein</option>
      </select>
    </div>
  );
}

export default function FootballMatchesClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const date = searchParams.get("date") ?? "";
  const leagueId = searchParams.get("leagueId") ?? "";
  const leagueName = searchParams.get("leagueName") ?? "";
  const teamId = searchParams.get("teamId") ?? "";
  const teamName = searchParams.get("teamName") ?? "";
  const status = searchParams.get("status") ?? "";
  const visible = searchParams.get("visible") ?? "";
  const hasAnalysis = searchParams.get("hasAnalysis") ?? "";
  const hasTip = searchParams.get("hasTip") ?? "";
  const settled = searchParams.get("settled") ?? "";
  const offset = Number(searchParams.get("offset") ?? "0") || 0;

  const [matches, setMatches] = useState<FootballMatch[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const allLeaguesRef = useRef<FootballLeague[] | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    const qs = new URLSearchParams();
    if (date) qs.set("date", date);
    if (leagueId) qs.set("leagueId", leagueId);
    if (teamId) qs.set("teamId", teamId);
    if (status) qs.set("status", status);
    if (visible) qs.set("visible", visible);
    if (hasAnalysis) qs.set("hasAnalysis", hasAnalysis);
    if (hasTip) qs.set("hasTip", hasTip);
    if (settled) qs.set("settled", settled);
    qs.set("limit", String(PAGE_SIZE));
    qs.set("offset", String(offset));

    try {
      const res = await fetch(`/api/football/matches?${qs.toString()}`);
      if (res.status === 502) {
        setState("unreachable");
        return;
      }
      if (!res.ok) {
        setState("error");
        return;
      }
      const data = await res.json().catch(() => null);
      const list: FootballMatch[] = Array.isArray(data) ? data : (data?.matches ?? []);
      setMatches(list);
      setCount(typeof data?.count === "number" ? data.count : null);
      setState("loaded");
    } catch {
      setState("unreachable");
    }
  }, [date, leagueId, teamId, status, visible, hasAnalysis, hasTip, settled, offset]);

  useEffect(() => {
    load();
  }, [load]);

  // Section 6: Liga-Suche mit Namen statt ID - die vollständige Ligaliste ist
  // klein genug, um einmal zu laden und clientseitig zu filtern (dieselbe
  // Liste, die auch die Ligen-Hauptseite nutzt).
  async function searchLeagues(query: string): Promise<AutocompleteOption[]> {
    if (!allLeaguesRef.current) {
      const res = await fetch("/api/football/leagues");
      const data = await res.json().catch(() => null);
      allLeaguesRef.current = Array.isArray(data) ? data : (data?.leagues ?? []);
    }
    const q = query.toLowerCase();
    return (allLeaguesRef.current ?? [])
      .filter((l) => (l.name ?? "").toLowerCase().includes(q) || String(l.country ?? "").toLowerCase().includes(q))
      .slice(0, 8)
      .map((l) => ({ id: l.leagueId, label: l.name ?? l.leagueId, sublabel: typeof l.country === "string" ? l.country : undefined }));
  }

  // Section 6: Team-Suche mit Namen und Wappen - serverseitig, da die
  // Teamliste (mehrere Tausend Einträge) zu groß für einen einmaligen
  // Client-Fetch ist.
  async function searchTeams(query: string): Promise<AutocompleteOption[]> {
    const res = await fetch(`/api/football/teams?search=${encodeURIComponent(query)}&limit=8`);
    const data = await res.json().catch(() => null);
    const teams: FootballTeamProfile[] = Array.isArray(data) ? data : (data?.teams ?? []);
    return teams.map((t) => ({ id: t.id, label: t.name, sublabel: t.league_name ?? undefined, logoUrl: t.logo }));
  }

  function updateEntityParam(idKey: string, nameKey: string, id: string | null, name: string | null) {
    const qs = new URLSearchParams(searchParams.toString());
    if (id) {
      qs.set(idKey, id);
      qs.set(nameKey, name ?? "");
    } else {
      qs.delete(idKey);
      qs.delete(nameKey);
    }
    qs.delete("offset");
    router.replace(`/football/matches${qs.toString() ? `?${qs.toString()}` : ""}`);
  }

  function updateParam(key: string, value: string) {
    const qs = new URLSearchParams(searchParams.toString());
    if (value) qs.set(key, value);
    else qs.delete(key);
    qs.delete("offset");
    router.replace(`/football/matches${qs.toString() ? `?${qs.toString()}` : ""}`);
  }

  function goToOffset(next: number) {
    const qs = new URLSearchParams(searchParams.toString());
    if (next > 0) qs.set("offset", String(next));
    else qs.delete("offset");
    router.replace(`/football/matches${qs.toString() ? `?${qs.toString()}` : ""}`);
  }

  const columns: Column<FootballMatch>[] = [
    {
      header: "Anstoß (UTC)",
      cell: (m) => <span className="whitespace-nowrap text-neutral-500">{m.kickoffUtc ?? "–"}</span>,
    },
    { header: "Liga", cell: (m) => m.league?.name ?? "–" },
    { header: "Heim", cell: (m) => m.homeTeam?.name ?? "–" },
    { header: "Gast", cell: (m) => m.awayTeam?.name ?? "–" },
    { header: "Status", cell: (m) => (m.status ? <Badge tone="gold">{matchStatusLabel(m.status)}</Badge> : "–") },
    {
      header: "Ergebnis",
      cell: (m) =>
        m.homeGoals != null || m.awayGoals != null ? `${m.homeGoals ?? "–"}:${m.awayGoals ?? "–"}` : "–",
    },
    {
      header: "Sichtbar",
      info: "Ob dieses Spiel in der App für Nutzer angezeigt wird.",
      cell: (m) => <Badge tone={m.visible ? "green" : "neutral"}>{m.visible ? "Ja" : "Nein"}</Badge>,
    },
    {
      header: "Analyse",
      info: "Ob PHÖNIX für dieses Spiel bereits eine Analyse (Vorhersage/Tipp) erstellt hat.",
      cell: (m) => <Badge tone={m.hasAnalysis ? "green" : "neutral"}>{m.hasAnalysis ? "Ja" : "Nein"}</Badge>,
    },
    {
      header: "Top-Tipp",
      info: "Der zuletzt veröffentlichte PHÖNIX-Tipp für dieses Spiel, falls vorhanden.",
      cell: (m) => (m.topTip ? <Badge tone="gold">{m.topTip.marketLabel}</Badge> : "–"),
    },
    {
      header: "Letzte Aktualisierung",
      cell: (m) => <span className="whitespace-nowrap text-neutral-500">{formatUpdatedAt(m.updatedAt)}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-1.5 text-xl font-semibold text-neutral-900">
          Matches
          <InfoTooltip text="Alle bekannten Fußballspiele. Klicke auf ein Spiel für Details und um einzelne Funktionen (z.B. Sichtbarkeit, Live) an- oder auszuschalten." />
        </h1>
        <p className="text-sm text-neutral-400">
          Spielverwaltung: Sichtbarkeit, Analyse, Tipp, Lern- und Live-Funktionen je Spiel.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="date" className="mb-1 block text-xs font-medium text-neutral-600">
            Datum
          </label>
          <input
            id="date"
            type="date"
            defaultValue={date}
            className={inputClass}
            onChange={(e) => updateParam("date", e.target.value)}
          />
        </div>
        <EntityAutocomplete
          id="leagueId"
          label="Liga"
          placeholder="Liga suchen…"
          selectedLabel={leagueId ? leagueName || leagueId : null}
          onSearch={searchLeagues}
          onSelect={(o) => updateEntityParam("leagueId", "leagueName", o.id, o.label)}
          onClear={() => updateEntityParam("leagueId", "leagueName", null, null)}
        />
        <EntityAutocomplete
          id="teamId"
          label="Team"
          placeholder="Team suchen…"
          selectedLabel={teamId ? teamName || teamId : null}
          onSearch={searchTeams}
          onSelect={(o) => updateEntityParam("teamId", "teamName", o.id, o.label)}
          onClear={() => updateEntityParam("teamId", "teamName", null, null)}
        />
        <div>
          <label htmlFor="status" className="mb-1 block text-xs font-medium text-neutral-600">
            Status
          </label>
          <select id="status" value={status} className={inputClass} onChange={(e) => updateParam("status", e.target.value)}>
            <option value="">Alle</option>
            {Object.entries(MATCH_STATUS_LABEL).map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <BoolSelect id="visible" label="Sichtbar" value={visible} onChange={(v) => updateParam("visible", v)} />
        <BoolSelect
          id="hasAnalysis"
          label="Analyse"
          value={hasAnalysis}
          onChange={(v) => updateParam("hasAnalysis", v)}
        />
        <BoolSelect id="hasTip" label="Tipp vorhanden" value={hasTip} onChange={(v) => updateParam("hasTip", v)} />
        <BoolSelect id="settled" label="Settled (abgerechnet)" value={settled} onChange={(v) => updateParam("settled", v)} />
      </div>

      <Card>
        {state === "loading" && <LoadingState />}
        {state === "unreachable" && (
          <StateMessage
            title="PHÖNIX Backend nicht erreichbar"
            description="Die Verbindung zum Backend konnte nicht hergestellt werden."
            onRetry={load}
          />
        )}
        {state === "error" && (
          <StateMessage title="Matches konnten nicht geladen werden" description="Ein unerwarteter Fehler ist aufgetreten." onRetry={load} />
        )}
        {state === "loaded" && (
          <>
            <DataTable
              columns={columns}
              rows={matches}
              rowKey={(m) => m.id}
              emptyMessage="Keine Matches gefunden"
              onRowClick={(m) => router.push(`/football/matches/${encodeURIComponent(m.id)}`)}
            />
            <Pagination offset={offset} limit={PAGE_SIZE} count={matches.length} total={count} onOffsetChange={goToOffset} />
          </>
        )}
      </Card>
    </div>
  );
}
