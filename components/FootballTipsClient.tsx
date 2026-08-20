"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import DataTable, { Column } from "@/components/ui/DataTable";
import InfoTooltip from "@/components/ui/InfoTooltip";
import StateMessage from "@/components/ui/StateMessage";
import type { FootballTip } from "@/lib/types";

type LoadState = "loading" | "loaded" | "unreachable" | "error";

const PAGE_SIZE = 50;

const MARKET_OPTIONS: Array<{ key: string; label: string }> = [
  { key: "homeWin", label: "Heimsieg" },
  { key: "draw", label: "Unentschieden" },
  { key: "awayWin", label: "Auswärtssieg" },
  { key: "over25", label: "Über 2,5 Tore" },
  { key: "under25", label: "Unter 2,5 Tore" },
  { key: "bttsYes", label: "Beide Teams treffen – Ja" },
  { key: "bttsNo", label: "Beide Teams treffen – Nein" },
];

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

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "–";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "–";
  return `${date.toLocaleDateString("de-DE")} · ${date.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  })} Uhr`;
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

export default function FootballTipsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const dateFrom = searchParams.get("dateFrom") ?? "";
  const dateTo = searchParams.get("dateTo") ?? "";
  const leagueId = searchParams.get("leagueId") ?? "";
  const teamId = searchParams.get("teamId") ?? "";
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

  const load = useCallback(async () => {
    setState("loading");
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
    } catch {
      setState("unreachable");
    }
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
    offset,
  ]);

  useEffect(() => {
    load();
  }, [load]);

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

  const columns: Column<FootballTip>[] = [
    {
      header: "Anstoß",
      cell: (t) => <span className="whitespace-nowrap text-neutral-500">{formatDateTime(t.kickoff)}</span>,
    },
    { header: "Liga", cell: (t) => t.league_name ?? "–" },
    {
      header: "Spiel",
      cell: (t) => (
        <span>
          {t.home_team_name ?? "?"} – {t.away_team_name ?? "?"}
        </span>
      ),
    },
    {
      header: "PHÖNIX-Tipp",
      info: "Der von PHÖNIX empfohlene Markt für dieses Spiel.",
      cell: (t) =>
        t.market_key ? (
          <span>
            {t.market_label}{" "}
            {typeof t.model_probability === "number" && (
              <span className="text-neutral-400">
                ({Math.round(t.model_probability * 1000) / 10} %)
              </span>
            )}
          </span>
        ) : (
          <span className="text-neutral-400">Kein Tipp</span>
        ),
    },
    {
      header: "Ergebnis",
      info: "Ob dieser Tipp bereits abgerechnet wurde und wie er ausging.",
      cell: (t) => <Badge tone={resultTone(t.result_status)}>{resultLabel(t.result_status)}</Badge>,
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
      header: "Value",
      info: "Ob die Marktquote gegenüber der fairen PHÖNIX-Quote genug Wert bietet, um als Wette freigegeben zu werden.",
      cell: (t) => <Badge tone={t.is_value_tip ? "green" : "neutral"}>{t.is_value_tip ? "Ja" : "Nein"}</Badge>,
    },
    {
      header: "Whitelist",
      cell: (t) => whitelistLabel(t.whitelist_status),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-1.5 text-xl font-semibold text-neutral-900">
          Tipps
          <InfoTooltip text="Alle PHÖNIX-Tipps - dieselbe Quelle, die auch die App verwendet. Ein Klick auf einen Tipp zeigt die vollständige Analyse-Historie für dieses Spiel." />
        </h1>
        <p className="text-sm text-neutral-400">
          Vollständige Tippübersicht mit Filtern. Identisch mit dem, was in der App sichtbar ist.
        </p>
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
        <div>
          <label htmlFor="leagueId" className="mb-1 block text-xs font-medium text-neutral-600">
            Liga-ID
          </label>
          <input
            id="leagueId"
            defaultValue={leagueId}
            className={inputClass}
            onBlur={(e) => updateParam("leagueId", e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") updateParam("leagueId", (e.target as HTMLInputElement).value);
            }}
          />
        </div>
        <div>
          <label htmlFor="teamId" className="mb-1 block text-xs font-medium text-neutral-600">
            Team-ID
          </label>
          <input
            id="teamId"
            defaultValue={teamId}
            className={inputClass}
            onBlur={(e) => updateParam("teamId", e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") updateParam("teamId", (e.target as HTMLInputElement).value);
            }}
          />
        </div>
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
        {state === "loading" && <p className="py-8 text-center text-sm text-neutral-400">Wird geladen…</p>}
        {state === "unreachable" && (
          <StateMessage
            title="PHÖNIX Backend nicht erreichbar"
            description="Die Verbindung zum Backend konnte nicht hergestellt werden."
          />
        )}
        {state === "error" && (
          <StateMessage title="Tipps konnten nicht geladen werden" description="Ein unerwarteter Fehler ist aufgetreten." />
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
            {tips.length > 0 && (
              <div className="mt-3 flex items-center justify-between text-xs text-neutral-400">
                <span>
                  {count != null ? `${offset + 1}–${offset + tips.length} von ${count}` : `${tips.length} Einträge`}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    disabled={offset === 0}
                    onClick={() => goToOffset(Math.max(0, offset - PAGE_SIZE))}
                  >
                    Zurück
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={tips.length < PAGE_SIZE}
                    onClick={() => goToOffset(offset + PAGE_SIZE)}
                  >
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
