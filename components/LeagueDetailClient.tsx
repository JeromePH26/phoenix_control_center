"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Badge from "@/components/ui/Badge";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import DataTable, { Column } from "@/components/ui/DataTable";
import InfoTooltip from "@/components/ui/InfoTooltip";
import JsonViewer from "@/components/ui/JsonViewer";
import StateMessage from "@/components/ui/StateMessage";
import Tabs from "@/components/ui/Tabs";
import AssetGallery from "@/components/AssetGallery";
import ConfirmDialog from "@/components/ConfirmDialog";
import UploadAssetModal from "@/components/UploadAssetModal";
import EntityPerformancePanel from "@/components/EntityPerformancePanel";
import EntityCountsBlock from "@/components/EntityCountsBlock";
import DataCoveragePanel from "@/components/DataCoveragePanel";
import LeagueLearningPanel from "@/components/LeagueLearningPanel";
import LeagueTeamsPanel from "@/components/LeagueTeamsPanel";
import type { FootballAsset, FootballLeague, FootballTip, LeagueManualStatus, LeagueTeamRow } from "@/lib/types";

type LoadState = "loading" | "loaded" | "notfound" | "unreachable" | "error";

const STATUS_LABEL: Record<LeagueManualStatus, string> = { auto: "Auto", whitelist: "Whitelist", blacklist: "Blacklist" };
const STATUSES: LeagueManualStatus[] = ["auto", "whitelist", "blacklist"];
function statusTone(status: string | undefined): "green" | "red" | "neutral" {
  if (status === "whitelist") return "green";
  if (status === "blacklist") return "red";
  return "neutral";
}

const HISTORICAL_STATUS_LABEL: Record<string, string> = { active: "Aktiv", inactive: "Inaktiv", archived: "Archiviert" };
const GENDER_LABEL: Record<string, string> = { male: "Herren", female: "Damen" };
const LEAGUE_KNOWN_KEYS = new Set([
  "leagueId", "name", "manualStatus", "league_id", "league_name", "manual_status",
  "country", "gender", "competition_level", "total_samples", "successful_full_analyses",
  "historical_status", "last_seen_at", "seasons", "has_logo",
]);

function levelLabel(level: unknown): string {
  const n = typeof level === "number" ? level : null;
  if (n === 1) return "1. Liga (Top)";
  if (n === 2) return "2. Liga";
  if (n === 3) return "3. Liga";
  if (n == null) return "Pokal / International";
  return `Stufe ${n}`;
}

const RESULT_LABEL: Record<string, string> = { pending: "Offen", won: "Gewonnen", lost: "Verloren", push: "Rückgabe" };
function resultTone(status: string): "gold" | "neutral" | "green" | "red" {
  if (status === "won") return "green";
  if (status === "lost") return "red";
  if (status === "pending") return "gold";
  return "neutral";
}
function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "–";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "–";
  return `${date.toLocaleDateString("de-DE")} · ${date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr`;
}

export default function LeagueDetailClient({ leagueId }: { leagueId: string }) {
  const router = useRouter();
  const [league, setLeague] = useState<FootballLeague | null>(null);
  const [tips, setTips] = useState<FootballTip[]>([]);
  const [teams, setTeams] = useState<LeagueTeamRow[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [showUpload, setShowUpload] = useState(false);
  const [imgVersion, setImgVersion] = useState(0);
  const [pendingStatus, setPendingStatus] = useState<LeagueManualStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const [leaguesRes, tipsRes, teamsRes] = await Promise.all([
        fetch("/api/football/leagues"),
        fetch(`/api/football/tips?leagueId=${encodeURIComponent(leagueId)}&limit=200`),
        fetch(`/api/football/leagues/${encodeURIComponent(leagueId)}/teams`),
      ]);
      if (leaguesRes.status === 502) {
        setState("unreachable");
        return;
      }
      if (!leaguesRes.ok) {
        setState("error");
        return;
      }
      const leaguesData = await leaguesRes.json().catch(() => null);
      const leagues: FootballLeague[] = Array.isArray(leaguesData) ? leaguesData : (leaguesData?.leagues ?? []);
      const found = leagues.find((l) => l.leagueId === leagueId) ?? null;
      if (!found) {
        setState("notfound");
        return;
      }
      setLeague(found);
      if (tipsRes.ok) {
        const data = await tipsRes.json().catch(() => null);
        setTips(Array.isArray(data?.tips) ? data.tips : []);
      }
      if (teamsRes.ok) {
        const data = await teamsRes.json().catch(() => null);
        setTeams(Array.isArray(data?.teams) ? data.teams : []);
      }
      setState("loaded");
    } catch {
      setState("unreachable");
    }
  }, [leagueId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleStatusConfirm() {
    if (!pendingStatus) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/football/leagues/${encodeURIComponent(leagueId)}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: pendingStatus }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? `Fehler (Status ${res.status}).`);
        return;
      }
      setPendingStatus(null);
      load();
    } catch {
      setError("Verbindung zum Backend fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  const columns: Column<FootballTip>[] = [
    { header: "Anstoß", cell: (t) => <span className="whitespace-nowrap text-neutral-500">{formatDateTime(t.kickoff)}</span> },
    { header: "Spiel", cell: (t) => `${t.home_team_name ?? "?"} – ${t.away_team_name ?? "?"}` },
    { header: "PHÖNIX-Tipp", cell: (t) => (t.market_key ? t.market_label : "Kein Tipp") },
    { header: "Ergebnis", cell: (t) => <Badge tone={resultTone(t.result_status)}>{RESULT_LABEL[t.result_status] ?? t.result_status}</Badge> },
  ];

  const imageSrc = `/api/football/assets/image?type=league&id=${encodeURIComponent(leagueId)}&v=${imgVersion}`;
  const uploadAsset: FootballAsset = { type: "league", id: leagueId, entityName: league?.name ?? leagueId, status: "OK" };
  const status = typeof league?.manualStatus === "string" ? (league.manualStatus as LeagueManualStatus) : undefined;

  const tabs = [
    { key: "overview", label: "Übersicht" },
    { key: "performance", label: "Performance" },
    { key: "markets", label: "Märkte" },
    { key: "tips", label: "Tipps" },
    { key: "teams", label: `Teams (${teams.length})` },
    { key: "data", label: "Daten" },
    { key: "learning", label: "Learning" },
    { key: "assets", label: "Assets" },
    { key: "technical", label: "Technische Details" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Breadcrumbs
          items={[
            { label: "Ligen", href: "/football/leagues" },
            ...(league?.country ? [{ label: String(league.country) }] : []),
            { label: league?.name ?? leagueId },
          ]}
        />
        <div className="mt-1 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-md border border-neutral-100 bg-neutral-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageSrc}
              alt=""
              className="h-full w-full object-contain p-1"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
          <h1 className="text-xl font-semibold text-neutral-900">{league?.name ?? "Liga"}</h1>
          {status && <Badge tone={statusTone(status)}>{STATUS_LABEL[status]}</Badge>}
        </div>
      </div>

      {state === "loading" && <p className="text-sm text-neutral-400">Liga wird geladen…</p>}
      {state === "notfound" && <StateMessage title="Liga nicht gefunden" description="Für diese ID liegen keine Daten vor." />}
      {state === "unreachable" && (
        <StateMessage title="PHÖNIX Backend nicht erreichbar" description="Die Verbindung zum Backend konnte nicht hergestellt werden." />
      )}
      {state === "error" && <StateMessage title="Liga konnte nicht geladen werden" description="Ein unerwarteter Fehler ist aufgetreten." />}

      {state === "loaded" && league && (
        <Tabs tabs={tabs}>
          {(active) => (
            <>
              {active === "overview" && (
                <div className="space-y-6">
                  <Card
                    title="Basisdaten"
                    action={
                      <div className="flex gap-1.5">
                        {STATUSES.map((s) => (
                          <Button
                            key={s}
                            variant={status === s ? "primary" : "secondary"}
                            disabled={status === s}
                            onClick={() => {
                              setPendingStatus(s);
                              setError(null);
                            }}
                          >
                            {STATUS_LABEL[s]}
                          </Button>
                        ))}
                      </div>
                    }
                  >
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
                      <div>
                        <p className="text-neutral-500">Status</p>
                        <p>
                          <Badge tone={statusTone(status)}>{status ? STATUS_LABEL[status] : "–"}</Badge>
                        </p>
                      </div>
                      <div>
                        <p className="text-neutral-500">Land</p>
                        <p className="font-medium text-neutral-900">{typeof league.country === "string" ? league.country : "–"}</p>
                      </div>
                      <div>
                        <p className="text-neutral-500">Wettbewerbsstufe</p>
                        <p className="font-medium text-neutral-900">{levelLabel(league.competition_level)}</p>
                      </div>
                      <div>
                        <p className="text-neutral-500">Geschlecht</p>
                        <p className="font-medium text-neutral-900">
                          {typeof league.gender === "string" ? (GENDER_LABEL[league.gender] ?? league.gender) : "–"}
                        </p>
                      </div>
                      <div>
                        <p className="text-neutral-500">Historie</p>
                        <p className="font-medium text-neutral-900">
                          {typeof league.historical_status === "string"
                            ? (HISTORICAL_STATUS_LABEL[league.historical_status] ?? league.historical_status)
                            : "–"}
                        </p>
                      </div>
                      <div>
                        <p className="text-neutral-500">Zuletzt gesehen</p>
                        <p className="font-medium text-neutral-900">{formatDateTime(league.last_seen_at as string | null | undefined)}</p>
                      </div>
                    </div>
                  </Card>

                  <Card
                    title={
                      <span className="inline-flex items-center gap-1">
                        Auf einen Blick
                        <InfoTooltip text="Echte Zähler aus der Datenbank - kein Zeitraumfilter, keine Begrenzung durch Seitenanzeige." />
                      </span>
                    }
                  >
                    <EntityCountsBlock leagueId={leagueId} />
                  </Card>
                </div>
              )}

              {active === "performance" && (
                <Card>
                  <EntityPerformancePanel leagueId={leagueId} mode="performance" />
                </Card>
              )}

              {active === "markets" && (
                <Card>
                  <EntityPerformancePanel leagueId={leagueId} mode="markets" />
                </Card>
              )}

              {active === "tips" && (
                <Card title="Alle Analysen">
                  <DataTable
                    columns={columns}
                    rows={tips}
                    rowKey={(t) => `${t.phase_two_scan_run_id}-${t.fixture_id}`}
                    emptyMessage="Keine Analysen für diese Liga gefunden"
                    onRowClick={(t) => router.push(`/football/matches/${encodeURIComponent(t.fixture_id)}`)}
                  />
                </Card>
              )}

              {active === "teams" && (
                <Card>
                  <LeagueTeamsPanel teams={teams} />
                </Card>
              )}

              {active === "data" && (
                <Card>
                  <DataCoveragePanel leagueId={leagueId} />
                </Card>
              )}

              {active === "learning" && (
                <Card>
                  <LeagueLearningPanel leagueId={leagueId} />
                </Card>
              )}

              {active === "assets" && (
                <Card>
                  <AssetGallery type="league" id={leagueId} imageSrc={imageSrc} entityName={league.name} onReplace={() => setShowUpload(true)} />
                </Card>
              )}

              {active === "technical" && (
                <Card title="Technische Details">
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-neutral-500">Liga-ID</p>
                      <p className="font-mono text-xs text-neutral-500">{league.leagueId}</p>
                    </div>
                    <div>
                      <p className="text-neutral-500">Analysierte Samples (Legacy-Zähler)</p>
                      <p className="font-medium text-neutral-900">{typeof league.total_samples === "number" ? league.total_samples : "0"}</p>
                    </div>
                    {Object.keys(league).some((k) => !LEAGUE_KNOWN_KEYS.has(k)) && (
                      <JsonViewer
                        label="Weitere Rohdaten"
                        value={Object.fromEntries(Object.entries(league).filter(([k]) => !LEAGUE_KNOWN_KEYS.has(k)))}
                      />
                    )}
                  </div>
                </Card>
              )}
            </>
          )}
        </Tabs>
      )}

      {showUpload && (
        <UploadAssetModal
          asset={uploadAsset}
          onClose={() => setShowUpload(false)}
          onUploaded={() => {
            setShowUpload(false);
            setImgVersion((v) => v + 1);
          }}
        />
      )}

      {pendingStatus && league && (
        <ConfirmDialog
          title="Liga-Status ändern"
          description={`"${league.name}" wird auf "${STATUS_LABEL[pendingStatus]}" gesetzt.`}
          confirmLabel="Bestätigen"
          busy={busy}
          error={error}
          onConfirm={handleStatusConfirm}
          onClose={() => setPendingStatus(null)}
        />
      )}
    </div>
  );
}
