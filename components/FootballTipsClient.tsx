"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import DataTable, { Column } from "@/components/ui/DataTable";
import EntityAutocomplete, { AutocompleteOption } from "@/components/ui/EntityAutocomplete";
import InfoTooltip from "@/components/ui/InfoTooltip";
import LastUpdated from "@/components/ui/LastUpdated";
import LoadingState from "@/components/ui/LoadingState";
import Pagination from "@/components/ui/Pagination";
import StateMessage from "@/components/ui/StateMessage";
import type { FootballLeague, FootballTeamProfile, FootballTip } from "@/lib/types";

type LoadState = "loading" | "loaded" | "unreachable" | "error";

const PAGE_SIZE = 50;
// Section 12 (AN2): CSV-Export lädt den vollständigen gefilterten Datensatz,
// nicht nur die aktuelle Seite - server-seitiges Limit pro Anfrage ist 200,
// also mehrere Seiten nachladen. Deckel bei 5000 Zeilen (25 Anfragen), damit
// ein sehr breiter Filter nicht unbegrenzt viele Backend-Anfragen auslöst.
const EXPORT_PAGE_SIZE = 200;
const EXPORT_MAX_ROWS = 5000;

const MARKET_OPTIONS: Array<{ key: string; label: string; group: string }> = [
  { key: "homeWin", label: "Heimsieg", group: "Sieger (1X2)" },
  { key: "draw", label: "Unentschieden", group: "Sieger (1X2)" },
  { key: "awayWin", label: "Auswärtssieg", group: "Sieger (1X2)" },
  { key: "over25", label: "Über 2,5 Tore", group: "Toranzahl (Über/Unter)" },
  { key: "under25", label: "Unter 2,5 Tore", group: "Toranzahl (Über/Unter)" },
  { key: "bttsYes", label: "Beide Teams treffen – Ja", group: "Beide Teams treffen" },
  { key: "bttsNo", label: "Beide Teams treffen – Nein", group: "Beide Teams treffen" },
];
function marketGroupLabel(key: string | null | undefined): string {
  return MARKET_OPTIONS.find((m) => m.key === key)?.group ?? "–";
}

const RESULT_LABEL: Record<string, string> = {
  pending: "Offen",
  won: "Gewonnen",
  lost: "Verloren",
  push: "Rückgabe",
};
function resultLabel(status: string): string {
  return RESULT_LABEL[status] ?? status;
}
function resultTone(status: string): "gold" | "neutral" | "green" | "red" {
  if (status === "won") return "green";
  if (status === "lost") return "red";
  if (status === "pending") return "gold";
  return "neutral";
}

const WHITELIST_LABEL: Record<string, string> = {
  auto: "Automatisch",
  whitelist: "Whitelist",
  blacklist: "Blacklist",
};
function whitelistLabel(status: string | null | undefined): string {
  if (!status) return "–";
  return WHITELIST_LABEL[status] ?? status;
}

// Dieselbe Übersetzungstabelle wie in FootballMatchesClient - dort nicht
// exportiert, deshalb hier dupliziert (bestehendes Muster in dieser
// Codebasis, siehe RESULT_LABEL/WHITELIST_LABEL oben).
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
function matchStatusLabel(status: string | null | undefined): string {
  if (!status) return "–";
  return MATCH_STATUS_LABEL[status] ?? status;
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "–";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "–";
  return `${date.toLocaleDateString("de-DE")} · ${date.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  })} Uhr`;
}

function formatOdds(v: number | null | undefined): string {
  return typeof v === "number" ? v.toFixed(2) : "–";
}

function formatUnits(v: number | null | undefined): string {
  return typeof v === "number" ? `${v.toFixed(2)} U` : "–";
}

function formatProfit(v: number | null | undefined): string {
  if (typeof v !== "number") return "–";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(2)} U`;
}
function profitClass(v: number | null | undefined): string {
  if (typeof v !== "number" || v === 0) return "text-neutral-500";
  return v > 0 ? "text-green-600" : "text-red-600";
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

// CSV-Feld nach RFC 4180 escapen (Kommas, Anführungszeichen, Zeilenumbrüche).
function csvField(value: string): string {
  if (/[",\n;]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function tipToCsvRow(t: FootballTip): string[] {
  return [
    formatDateTime(t.kickoff),
    t.league_name ?? "",
    `${t.home_team_name ?? "?"} - ${t.away_team_name ?? "?"}`,
    marketGroupLabel(t.market_key),
    t.market_label ?? "",
    typeof t.model_probability === "number" ? String(Math.round(t.model_probability * 1000) / 10) : "",
    typeof t.market_odds === "number" ? t.market_odds.toFixed(2) : "",
    t.is_value_tip ? "Ja" : "Nein",
    String(t.data_quality ?? ""),
    String(t.confidence ?? ""),
    resultLabel(t.result_status),
    typeof t.assigned_units === "number" ? t.assigned_units.toFixed(2) : "",
    typeof t.profit_units === "number" ? t.profit_units.toFixed(2) : "",
    matchStatusLabel(t.match_status),
    whitelistLabel(t.whitelist_status),
    t.fixture_id,
  ];
}

const CSV_HEADER = [
  "Anstoß",
  "Liga",
  "Spiel",
  "Markt",
  "Auswahl",
  "Modellwahrscheinlichkeit (%)",
  "Buchmacherquote",
  "Value-Tipp",
  "Datenqualität",
  "Vertrauen",
  "Ergebnis",
  "Units",
  "Profit (Units)",
  "Status",
  "Whitelist",
  "Match-ID",
];

export default function FootballTipsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const dateFrom = searchParams.get("dateFrom") ?? "";
  const dateTo = searchParams.get("dateTo") ?? "";
  const leagueId = searchParams.get("leagueId") ?? "";
  const leagueName = searchParams.get("leagueName") ?? "";
  const teamId = searchParams.get("teamId") ?? "";
  const teamName = searchParams.get("teamName") ?? "";
  const marketKey = searchParams.get("marketKey") ?? "";
  const resultStatus = searchParams.get("resultStatus") ?? "";
  const whitelistStatus = searchParams.get("whitelistStatus") ?? "";
  const isValueTip = searchParams.get("isValueTip") ?? "";
  const hasTip = searchParams.get("hasTip") ?? "";
  const minDataQuality = searchParams.get("minDataQuality") ?? "";
  const minConfidence = searchParams.get("minConfidence") ?? "";
  const offset = Number(searchParams.get("offset") ?? "0") || 0;

  const [tips, setTips] = useState<FootballTip[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [lastLoadedAt, setLastLoadedAt] = useState<string | null>(null);
  const [exportState, setExportState] = useState<"idle" | "exporting" | "error">("idle");

  const allLeaguesRef = useRef<FootballLeague[] | null>(null);

  const buildFilterQs = useCallback(() => {
    const qs = new URLSearchParams();
    if (dateFrom) qs.set("dateFrom", dateFrom);
    if (dateTo) qs.set("dateTo", dateTo);
    if (leagueId) qs.set("leagueId", leagueId);
    if (teamId) qs.set("teamId", teamId);
    if (marketKey) qs.set("marketKey", marketKey);
    if (resultStatus) qs.set("resultStatus", resultStatus);
    if (whitelistStatus) qs.set("whitelistStatus", whitelistStatus);
    if (isValueTip) qs.set("isValueTip", isValueTip);
    if (hasTip) qs.set("hasTip", hasTip);
    if (minDataQuality) qs.set("minDataQuality", minDataQuality);
    if (minConfidence) qs.set("minConfidence", minConfidence);
    return qs;
  }, [
    dateFrom,
    dateTo,
    leagueId,
    teamId,
    marketKey,
    resultStatus,
    whitelistStatus,
    isValueTip,
    hasTip,
    minDataQuality,
    minConfidence,
  ]);

  const load = useCallback(async () => {
    setState("loading");
    const qs = buildFilterQs();
    qs.set("limit", String(PAGE_SIZE));
    qs.set("offset", String(offset));

    try {
      const res = await fetch(`/api/football/tips?${qs.toString()}`);
      if (res.status === 502) {
        setState("unreachable");
        return;
      }
      if (!res.ok) {
        setState("error");
        return;
      }
      const data = await res.json().catch(() => null);
      setTips(Array.isArray(data?.tips) ? data.tips : []);
      setCount(typeof data?.total === "number" ? data.total : null);
      setState("loaded");
      setLastLoadedAt(new Date().toISOString());
    } catch {
      setState("unreachable");
    }
  }, [buildFilterQs, offset]);

  useEffect(() => {
    load();
  }, [load]);

  // Section 6/12: Liga-/Team-Suche mit Namen statt roher ID - dieselben
  // Endpunkte wie auf der Matches-Seite.
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
    router.replace(`/football/tips${qs.toString() ? `?${qs.toString()}` : ""}`);
  }

  function updateParam(key: string, value: string) {
    const qs = new URLSearchParams(searchParams.toString());
    if (value) qs.set(key, value);
    else qs.delete(key);
    qs.delete("offset");
    router.replace(`/football/tips${qs.toString() ? `?${qs.toString()}` : ""}`);
  }

  function goToOffset(next: number) {
    const qs = new URLSearchParams(searchParams.toString());
    if (next > 0) qs.set("offset", String(next));
    else qs.delete("offset");
    router.replace(`/football/tips${qs.toString() ? `?${qs.toString()}` : ""}`);
  }

  // Section 12: CSV-Export über den vollständigen gefilterten Datensatz.
  // Enthält ausschließlich Match-/Modelldaten, keine personenbezogenen
  // Daten - datenschutzrechtlich unbedenklich.
  async function exportCsv() {
    setExportState("exporting");
    try {
      const filterQs = buildFilterQs();
      const rows: FootballTip[] = [];
      let page = 0;
      let total: number | null = null;
      while (rows.length < EXPORT_MAX_ROWS) {
        const qs = new URLSearchParams(filterQs);
        qs.set("limit", String(EXPORT_PAGE_SIZE));
        qs.set("offset", String(page * EXPORT_PAGE_SIZE));
        const res = await fetch(`/api/football/tips?${qs.toString()}`);
        if (!res.ok) throw new Error("export_failed");
        const data = await res.json().catch(() => null);
        const batch: FootballTip[] = Array.isArray(data?.tips) ? data.tips : [];
        total = typeof data?.total === "number" ? data.total : total;
        rows.push(...batch);
        if (batch.length < EXPORT_PAGE_SIZE) break;
        if (total != null && rows.length >= total) break;
        page += 1;
      }
      const lines = [CSV_HEADER, ...rows.map(tipToCsvRow)].map((r) => r.map(csvField).join(";"));
      const csv = "﻿" + lines.join("\r\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `phoenix-tipps-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setExportState("idle");
    } catch {
      setExportState("error");
    }
  }

  const columns: Column<FootballTip>[] = [
    {
      header: "Anstoß",
      cell: (t) => <span className="whitespace-nowrap text-neutral-500">{formatDateTime(t.kickoff)}</span>,
    },
    {
      header: "Spiel",
      cell: (t) => (
        <span>
          {t.home_team_name ?? "?"} – {t.away_team_name ?? "?"}
        </span>
      ),
    },
    { header: "Liga", cell: (t) => t.league_name ?? "–" },
    {
      header: "Markt",
      info: "Übergeordnete Wettkategorie (z.B. Sieger, Toranzahl).",
      cell: (t) => (t.market_key ? marketGroupLabel(t.market_key) : <span className="text-neutral-400">–</span>),
    },
    {
      header: "Auswahl",
      info: "Die konkrete PHÖNIX-Empfehlung innerhalb des Marktes.",
      cell: (t) => (t.market_key ? t.market_label : <span className="text-neutral-400">Kein Tipp</span>),
    },
    {
      header: "Modellwahrscheinlichkeit",
      info: "Wie wahrscheinlich PHÖNIX dieses Ergebnis einschätzt.",
      cell: (t) =>
        typeof t.model_probability === "number" ? `${Math.round(t.model_probability * 1000) / 10} %` : "–",
    },
    {
      header: "Buchmacherquote",
      info: "Die am Markt beobachtete Quote für diese Auswahl.",
      cell: (t) => formatOdds(t.market_odds),
    },
    {
      header: "Value",
      info: "Ob die Marktquote gegenüber der fairen PHÖNIX-Quote genug Wert bietet, um als Wette freigegeben zu werden.",
      cell: (t) => (
        <Badge tone={t.is_value_tip ? "green" : "neutral"}>
          {t.is_value_tip ? "Ja" : "Nein"}
          {t.is_value_tip && typeof t.value_percent === "number" && t.value_percent !== 0
            ? ` (+${(Math.round(t.value_percent * 10) / 10).toString().replace(".", ",")} %)`
            : ""}
        </Badge>
      ),
    },
    {
      header: "Datenqualität",
      cell: (t) => `${t.data_quality} / 100`,
    },
    {
      header: "Vertrauen",
      info: "PHÖNIX-Vertrauenswert der Analyse (0-100).",
      cell: (t) => `${t.confidence} / 100`,
    },
    {
      header: "Ergebnis",
      info: "Ob dieser Tipp bereits abgerechnet wurde und wie er ausging.",
      cell: (t) => <Badge tone={resultTone(t.result_status)}>{resultLabel(t.result_status)}</Badge>,
    },
    {
      header: "Units",
      info: "Empfohlener Einsatz in Einheiten (Units), unabhängig vom tatsächlichen Geldbetrag.",
      cell: (t) => formatUnits(t.assigned_units),
    },
    {
      header: "Profit",
      info: "Gewinn/Verlust in Units, sobald der Tipp abgerechnet ist.",
      cell: (t) => <span className={profitClass(t.profit_units)}>{formatProfit(t.profit_units)}</span>,
    },
    {
      header: "Status",
      info: "Spielstatus zum Zeitpunkt des letzten Datenabgleichs.",
      cell: (t) => (t.match_status ? <Badge tone="gold">{matchStatusLabel(t.match_status)}</Badge> : "–"),
    },
    {
      header: "Whitelist",
      cell: (t) => whitelistLabel(t.whitelist_status),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-1.5 text-xl font-semibold text-neutral-900">
            Tipps
            <InfoTooltip text="Alle PHÖNIX-Tipps - dieselbe Quelle, die auch die App verwendet. Ein Klick auf einen Tipp öffnet das Spiel mit vollständiger Analyse-Historie." />
          </h1>
          <p className="text-sm text-neutral-400">
            Vollständige Tippübersicht mit Filtern. Identisch mit dem, was in der App sichtbar ist.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Button variant="secondary" onClick={exportCsv} disabled={exportState === "exporting" || tips.length === 0}>
            {exportState === "exporting" ? "Export läuft…" : "Als CSV exportieren"}
          </Button>
          {exportState === "error" && <span className="text-xs text-red-600">Export fehlgeschlagen. Erneut versuchen.</span>}
          {state === "loaded" && <LastUpdated iso={lastLoadedAt} />}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="dateFrom" className="mb-1 block text-xs font-medium text-neutral-600">
            Von
          </label>
          <input
            id="dateFrom"
            type="date"
            defaultValue={dateFrom}
            className={inputClass}
            onChange={(e) => updateParam("dateFrom", e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="dateTo" className="mb-1 block text-xs font-medium text-neutral-600">
            Bis
          </label>
          <input
            id="dateTo"
            type="date"
            defaultValue={dateTo}
            className={inputClass}
            onChange={(e) => updateParam("dateTo", e.target.value)}
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
          <label htmlFor="marketKey" className="mb-1 block text-xs font-medium text-neutral-600">
            Markt
          </label>
          <select
            id="marketKey"
            value={marketKey}
            className={inputClass}
            onChange={(e) => updateParam("marketKey", e.target.value)}
          >
            <option value="">Alle</option>
            {MARKET_OPTIONS.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="resultStatus" className="mb-1 block text-xs font-medium text-neutral-600">
            Ergebnis
          </label>
          <select
            id="resultStatus"
            value={resultStatus}
            className={inputClass}
            onChange={(e) => updateParam("resultStatus", e.target.value)}
          >
            <option value="">Alle</option>
            <option value="pending">Offen</option>
            <option value="won">Gewonnen</option>
            <option value="lost">Verloren</option>
            <option value="push">Rückgabe</option>
          </select>
        </div>
        <div>
          <label htmlFor="whitelistStatus" className="mb-1 block text-xs font-medium text-neutral-600">
            Whitelist
          </label>
          <select
            id="whitelistStatus"
            value={whitelistStatus}
            className={inputClass}
            onChange={(e) => updateParam("whitelistStatus", e.target.value)}
          >
            <option value="">Alle</option>
            <option value="auto">Automatisch</option>
            <option value="whitelist">Whitelist</option>
            <option value="blacklist">Blacklist</option>
          </select>
        </div>
        <BoolSelect id="hasTip" label="Tipp vorhanden" value={hasTip} onChange={(v) => updateParam("hasTip", v)} />
        <BoolSelect
          id="isValueTip"
          label="Value-Tipp"
          value={isValueTip}
          onChange={(v) => updateParam("isValueTip", v)}
        />
        <div>
          <label htmlFor="minDataQuality" className="mb-1 block text-xs font-medium text-neutral-600">
            Min. Datenqualität
          </label>
          <input
            id="minDataQuality"
            type="number"
            min={0}
            max={100}
            defaultValue={minDataQuality}
            className={`${inputClass} w-24`}
            onBlur={(e) => updateParam("minDataQuality", e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="minConfidence" className="mb-1 block text-xs font-medium text-neutral-600">
            Min. Vertrauen
          </label>
          <input
            id="minConfidence"
            type="number"
            min={0}
            max={100}
            defaultValue={minConfidence}
            className={`${inputClass} w-24`}
            onBlur={(e) => updateParam("minConfidence", e.target.value)}
          />
        </div>
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
          <StateMessage
            title="Tipps konnten nicht geladen werden"
            description="Ein unerwarteter Fehler ist aufgetreten."
            onRetry={load}
          />
        )}
        {state === "loaded" && (
          <>
            <DataTable
              columns={columns}
              rows={tips}
              rowKey={(t) => `${t.phase_two_scan_run_id}-${t.fixture_id}`}
              emptyMessage="Keine Tipps gefunden"
              onRowClick={(t) => router.push(`/football/matches/${encodeURIComponent(t.fixture_id)}`)}
            />
            <Pagination offset={offset} limit={PAGE_SIZE} count={tips.length} total={count} onOffsetChange={goToOffset} />
          </>
        )}
      </Card>
    </div>
  );
}
