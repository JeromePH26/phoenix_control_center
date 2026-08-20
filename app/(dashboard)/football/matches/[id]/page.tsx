"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import InfoTooltip from "@/components/ui/InfoTooltip";
import JsonViewer from "@/components/ui/JsonViewer";
import KeyValueList from "@/components/ui/KeyValueList";
import StateMessage from "@/components/ui/StateMessage";
import FlagChangeDialog from "@/components/FlagChangeDialog";
import type { FootballMatchDetail } from "@/lib/types";

type LoadState = "loading" | "loaded" | "unreachable" | "notfound" | "error";

type FlagKey = "visible" | "analysisEnabled" | "tipEnabled" | "learningEnabled" | "liveEnabled";

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

const FLAGS: { key: FlagKey; label: string; info: string }[] = [
  { key: "visible", label: "Sichtbar", info: "Aus = Nutzer sehen dieses Spiel gar nicht in der App." },
  { key: "analysisEnabled", label: "Analyse aktiviert", info: "Aus = PHÖNIX berechnet keine Prognose/Wahrscheinlichkeiten mehr für dieses Spiel." },
  { key: "tipEnabled", label: "Tipp aktiviert", info: "Aus = für dieses Spiel wird kein PHÖNIX-Tipp mehr angezeigt, auch wenn eine Analyse vorliegt." },
  { key: "learningEnabled", label: "Learning aktiviert", info: "Aus = dieses Spiel fließt nicht ins automatische Lernen/Verbessern der Modelle ein." },
  { key: "liveEnabled", label: "Live aktiviert", info: "Aus = keine Live-Aktualisierungen (Tore, Karten) für dieses einzelne Spiel." },
];

const KNOWN_KEYS = new Set([
  "id",
  "kickoffUtc",
  "league",
  "homeTeam",
  "awayTeam",
  "status",
  "homeGoals",
  "awayGoals",
  "visible",
  "analysisEnabled",
  "tipEnabled",
  "learningEnabled",
  "liveEnabled",
  "hasAnalysis",
  "latestAnalysis",
  "analysisSnapshot",
]);

function fmt(value: unknown): string {
  if (value === null || value === undefined || value === "") return "Nicht verfügbar";
  return String(value);
}

function scoreLabel(value: number | null | undefined): string {
  if (value === null || value === undefined) return "";
  if (value >= 75) return "Hoch";
  if (value >= 50) return "Mittel";
  return "Niedrig";
}

function scoreTone(value: number | null | undefined): "green" | "gold" | "red" | "neutral" {
  if (value === null || value === undefined) return "neutral";
  if (value >= 75) return "green";
  if (value >= 50) return "gold";
  return "red";
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "Nicht verfügbar";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Nicht verfügbar";
  return `${date.toLocaleDateString("de-DE")} · ${date.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  })} Uhr`;
}

interface AnalysisHistoryRow {
  phase_two_scan_run_id: number;
  created_at?: string | null;
  kickoff?: string | null;
  model_version: string;
  market_key: string;
  market_label: string;
  model_probability?: number | null;
  data_quality: number;
  confidence: number;
  result_status: string;
  is_value_tip?: boolean | null;
}

const RESULT_LABEL: Record<string, string> = {
  pending: "Offen",
  won: "Gewonnen",
  lost: "Verloren",
  push: "Rückgabe",
};

export default function MatchDetailPage({ params }: { params: { id: string } }) {
  const [match, setMatch] = useState<FootballMatchDetail | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [flagTarget, setFlagTarget] = useState<(typeof FLAGS)[number] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<AnalysisHistoryRow[] | null>(null);
  const [historyState, setHistoryState] = useState<"loading" | "loaded" | "error">("loading");

  const load = useCallback(async () => {
    setState("loading");
    try {
      const res = await fetch(`/api/football/matches/${encodeURIComponent(params.id)}`);
      if (res.status === 404) {
        setState("notfound");
        return;
      }
      if (res.status === 502) {
        setState("unreachable");
        return;
      }
      if (!res.ok) {
        setState("error");
        return;
      }
      const data = await res.json().catch(() => null);
      setMatch(data ?? null);
      setState(data ? "loaded" : "notfound");
    } catch {
      setState("unreachable");
    }
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    setHistoryState("loading");
    fetch(`/api/football/tips/${encodeURIComponent(params.id)}/history`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data) => {
        if (cancelled) return;
        setHistory(Array.isArray(data?.history) ? data.history : []);
        setHistoryState("loaded");
      })
      .catch(() => {
        if (!cancelled) setHistoryState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  async function handleFlagChange(reason: string, comment: string) {
    if (!flagTarget || !match) return;
    setBusy(true);
    setError(null);
    try {
      const nextValue = !match[flagTarget.key];
      const res = await fetch(`/api/football/matches/${encodeURIComponent(params.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [flagTarget.key]: nextValue, reason, comment: comment || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? `Fehler (Status ${res.status}).`);
        return;
      }
      setFlagTarget(null);
      load();
    } catch {
      setError("Verbindung zum Backend fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  // Felder, die zwar vom Backend mitgeschickt werden, aber für niemanden
  // hier lesbar/nützlich sind (z.B. der komplette rohe API-Football-JSON-
  // Blob) - die werden komplett ausgeblendet statt als unlesbarer Text
  // angezeigt.
  const HIDDEN_EXTRA_FIELDS = new Set(["rawJson", "raw_json"]);
  const extraEntries = match
    ? Object.entries(match).filter(([k]) => !KNOWN_KEYS.has(k) && !HIDDEN_EXTRA_FIELDS.has(k))
    : [];
  const extraScalar = Object.fromEntries(extraEntries.filter(([, v]) => v === null || typeof v !== "object"));
  const extraObjects = extraEntries.filter(([, v]) => v !== null && typeof v === "object");
  const spacedLabel = (key: string) => {
    const spaced = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/_/g, " ");
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
  };

  return (
    <div className="space-y-6">
      <div>
        <Link href="/football/matches" className="text-xs text-neutral-400 hover:text-neutral-600">
          ← Zurück zu Matches
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-neutral-900">Match-Details</h1>
      </div>

      {state === "loading" && <p className="text-sm text-neutral-400">Wird geladen…</p>}
      {state === "notfound" && (
        <StateMessage title="Match nicht gefunden" description="Für diese ID liegen keine Daten vor." />
      )}
      {state === "unreachable" && (
        <StateMessage
          title="PHÖNIX Backend nicht erreichbar"
          description="Die Verbindung zum Backend konnte nicht hergestellt werden."
        />
      )}
      {state === "error" && (
        <StateMessage title="Match konnte nicht geladen werden" description="Ein unerwarteter Fehler ist aufgetreten." />
      )}

      {state === "loaded" && match && (
        <>
          <Card title="Übersicht">
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-3">
              <div>
                <p className="text-neutral-500">Liga</p>
                <p className="font-medium text-neutral-900">{fmt(match.league?.name)}</p>
              </div>
              <div>
                <p className="text-neutral-500">Heim</p>
                <p className="font-medium text-neutral-900">{fmt(match.homeTeam?.name)}</p>
              </div>
              <div>
                <p className="text-neutral-500">Gast</p>
                <p className="font-medium text-neutral-900">{fmt(match.awayTeam?.name)}</p>
              </div>
              <div>
                <p className="text-neutral-500">Anstoß (UTC)</p>
                <p className="font-medium text-neutral-900">{fmt(match.kickoffUtc)}</p>
              </div>
              <div>
                <p className="text-neutral-500">Status</p>
                <p>
                  <Badge tone="gold">{match.status ? matchStatusLabel(match.status) : fmt(match.status)}</Badge>
                </p>
              </div>
              <div>
                <p className="text-neutral-500">Ergebnis</p>
                <p className="font-medium text-neutral-900">
                  {match.homeGoals ?? "–"} : {match.awayGoals ?? "–"}
                </p>
              </div>
            </div>
          </Card>

          <Card title="Flags" action={<span className="text-xs text-neutral-400">Jede Änderung erfordert einen Grund</span>}>
            <div className="space-y-2">
              {FLAGS.map((flag) => {
                const value = Boolean(match[flag.key]);
                return (
                  <div
                    key={flag.key}
                    className="flex items-center justify-between rounded-md border border-neutral-100 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-neutral-700">{flag.label}</span>
                      <InfoTooltip text={flag.info} />
                      <Badge tone={value ? "green" : "neutral"}>{value ? "An" : "Aus"}</Badge>
                    </div>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setFlagTarget(flag);
                        setError(null);
                      }}
                    >
                      {value ? "Deaktivieren" : "Aktivieren"}
                    </Button>
                  </div>
                );
              })}
            </div>
          </Card>

          {match.latestAnalysis && typeof match.latestAnalysis === "object" && (
            (() => {
              const a = match.latestAnalysis as Record<string, unknown>;
              const dataQuality = typeof a.data_quality === "number" ? a.data_quality : null;
              const confidence = typeof a.confidence === "number" ? a.confidence : null;
              const recommendation =
                typeof a.recommendation === "string" && a.recommendation.length > 0
                  ? a.recommendation
                  : null;
              return (
                <Card
                  title={
                    <span className="inline-flex items-center gap-1">
                      Letzte Analyse
                      <InfoTooltip text="Die zuletzt von PHÖNIX für dieses Spiel berechnete Einschätzung." />
                    </span>
                  }
                >
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-4">
                    <div>
                      <p className="text-neutral-500">Empfehlung</p>
                      <p className="font-medium text-neutral-900">{recommendation ?? "Kein Tipp"}</p>
                    </div>
                    <div>
                      <p className="text-neutral-500">Datenqualität</p>
                      <p>
                        <Badge tone={scoreTone(dataQuality)}>
                          {dataQuality ?? "–"} / 100 {scoreLabel(dataQuality)}
                        </Badge>
                      </p>
                    </div>
                    <div>
                      <p className="text-neutral-500">Vertrauen</p>
                      <p>
                        <Badge tone={scoreTone(confidence)}>
                          {confidence ?? "–"} / 100 {scoreLabel(confidence)}
                        </Badge>
                      </p>
                    </div>
                    <div>
                      <p className="text-neutral-500">Analysiert</p>
                      <p className="font-medium text-neutral-900">{formatDateTime(a.analyzed_at as string | undefined)}</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <JsonViewer value={a} label="Technische Details" />
                  </div>
                </Card>
              );
            })()
          )}

          <Card
            title={
              <span className="inline-flex items-center gap-1">
                Analyse-Historie
                <InfoTooltip text="Alle bisherigen PHÖNIX-Analyseläufe für dieses Spiel, älteste zuerst. So lässt sich nachvollziehen, wann und warum sich eine Einschätzung geändert hat." />
              </span>
            }
          >
            {historyState === "loading" && <p className="text-sm text-neutral-400">Wird geladen…</p>}
            {historyState === "error" && (
              <p className="text-sm text-neutral-400">Historie konnte nicht geladen werden.</p>
            )}
            {historyState === "loaded" && history && history.length === 0 && (
              <p className="text-sm text-neutral-400">Keine Analyse-Historie vorhanden.</p>
            )}
            {historyState === "loaded" && history && history.length > 0 && (
              <div className="space-y-2">
                {history.map((h) => (
                  <div
                    key={h.phase_two_scan_run_id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-neutral-100 px-3 py-2 text-sm"
                  >
                    <span className="whitespace-nowrap text-neutral-500">{formatDateTime(h.created_at)}</span>
                    <span className="font-medium text-neutral-900">
                      {h.market_key ? h.market_label : "Kein Tipp"}
                      {typeof h.model_probability === "number" && (
                        <span className="ml-1 text-neutral-400">
                          ({Math.round(h.model_probability * 1000) / 10} %)
                        </span>
                      )}
                    </span>
                    <span className="text-neutral-500">DQ {h.data_quality}/100</span>
                    <Badge
                      tone={
                        h.result_status === "won" ? "green" : h.result_status === "lost" ? "red" : h.result_status === "pending" ? "gold" : "neutral"
                      }
                    >
                      {RESULT_LABEL[h.result_status] ?? h.result_status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card
            title="Weitere Daten"
            action={
              <InfoTooltip text="Zusätzliche technische Felder aus dem Backend, die oben nicht extra aufgeführt sind. Für den Alltag meist nicht relevant." />
            }
          >
            <KeyValueList data={extraScalar} />
            {extraObjects.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-4">
                {extraObjects.map(([key, value]) => (
                  <JsonViewer key={key} value={value} label={spacedLabel(key)} />
                ))}
              </div>
            )}
          </Card>
        </>
      )}

      {flagTarget && match && (
        <FlagChangeDialog
          title={`${flagTarget.label} ändern`}
          description={`"${flagTarget.label}" wird ${match[flagTarget.key] ? "deaktiviert" : "aktiviert"}. Bitte einen Grund angeben.`}
          confirmLabel="Bestätigen"
          busy={busy}
          error={error}
          onConfirm={handleFlagChange}
          onClose={() => setFlagTarget(null)}
        />
      )}
    </div>
  );
}
