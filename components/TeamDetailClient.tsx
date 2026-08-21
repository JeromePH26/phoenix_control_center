"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import Card from "@/components/ui/Card";
import DataTable, { Column } from "@/components/ui/DataTable";
import InfoTooltip from "@/components/ui/InfoTooltip";
import StateMessage from "@/components/ui/StateMessage";
import Badge from "@/components/ui/Badge";
import Tabs from "@/components/ui/Tabs";
import AssetGallery from "@/components/AssetGallery";
import UploadAssetModal from "@/components/UploadAssetModal";
import EntityPerformancePanel from "@/components/EntityPerformancePanel";
import EntityCountsBlock from "@/components/EntityCountsBlock";
import DataCoveragePanel from "@/components/DataCoveragePanel";
import TeamMatchesPanel from "@/components/TeamMatchesPanel";
import type { FootballAsset, FootballTeamProfile, FootballTip } from "@/lib/types";

type LoadState = "loading" | "loaded" | "notfound" | "unreachable" | "error";

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

export default function TeamDetailClient({ teamId }: { teamId: string }) {
  const router = useRouter();
  const [team, setTeam] = useState<FootballTeamProfile | null>(null);
  const [tips, setTips] = useState<FootballTip[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [showUpload, setShowUpload] = useState(false);
  const [imgVersion, setImgVersion] = useState(0);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const [teamRes, tipsRes] = await Promise.all([
        fetch(`/api/football/teams/${encodeURIComponent(teamId)}`),
        fetch(`/api/football/tips?teamId=${encodeURIComponent(teamId)}&limit=200`),
      ]);
      if (teamRes.status === 404) {
        setState("notfound");
        return;
      }
      if (teamRes.status === 502) {
        setState("unreachable");
        return;
      }
      if (!teamRes.ok) {
        setState("error");
        return;
      }
      setTeam(await teamRes.json().catch(() => null));
      if (tipsRes.ok) {
        const data = await tipsRes.json().catch(() => null);
        setTips(Array.isArray(data?.tips) ? data.tips : []);
      }
      setState("loaded");
    } catch {
      setState("unreachable");
    }
  }, [teamId]);

  useEffect(() => {
    load();
  }, [load]);

  const columns: Column<FootballTip>[] = [
    { header: "Anstoß", cell: (t) => <span className="whitespace-nowrap text-neutral-500">{formatDateTime(t.kickoff)}</span> },
    { header: "Spiel", cell: (t) => `${t.home_team_name ?? "?"} – ${t.away_team_name ?? "?"}` },
    { header: "PHÖNIX-Tipp", cell: (t) => (t.market_key ? t.market_label : "Kein Tipp") },
    { header: "Ergebnis", cell: (t) => <Badge tone={resultTone(t.result_status)}>{RESULT_LABEL[t.result_status] ?? t.result_status}</Badge> },
  ];

  const imageSrc = team?.logo
    ? `/api/football/assets/image?type=team&id=${encodeURIComponent(teamId)}&source=${encodeURIComponent(String(team.logo))}&v=${imgVersion}`
    : null;

  const uploadAsset: FootballAsset = {
    type: "team",
    id: teamId,
    entityName: team?.name ?? teamId,
    status: "OK",
  };

  const tabs = [
    { key: "overview", label: "Übersicht" },
    { key: "performance", label: "Performance" },
    { key: "markets", label: "Märkte" },
    { key: "matches", label: "Spiele" },
    { key: "tips", label: "Tipps" },
    { key: "data", label: "Daten" },
    { key: "assets", label: "Assets" },
    { key: "technical", label: "Technische Details" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Breadcrumbs
          items={[
            { label: "Teams", href: "/football/teams" },
            ...(team?.league_name
              ? [{ label: team.league_name, href: team.league_id ? `/football/leagues/${encodeURIComponent(team.league_id)}` : undefined }]
              : []),
            { label: team?.name ?? teamId },
          ]}
        />
        <div className="mt-1 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-md border border-neutral-100 bg-neutral-50">
            {imageSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageSrc}
                alt=""
                className="h-full w-full object-contain p-1"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : null}
          </div>
          <h1 className="text-xl font-semibold text-neutral-900">{team?.name ?? "Team"}</h1>
        </div>
      </div>

      {state === "loading" && <p className="text-sm text-neutral-400">Team wird geladen…</p>}
      {state === "notfound" && <StateMessage title="Team nicht gefunden" description="Für diese ID liegen keine Daten vor." />}
      {state === "unreachable" && (
        <StateMessage title="PHÖNIX Backend nicht erreichbar" description="Die Verbindung zum Backend konnte nicht hergestellt werden." />
      )}
      {state === "error" && <StateMessage title="Team konnte nicht geladen werden" description="Ein unerwarteter Fehler ist aufgetreten." />}

      {state === "loaded" && team && (
        <Tabs tabs={tabs}>
          {(active) => (
            <>
              {active === "overview" && (
                <div className="space-y-6">
                  <Card title="Basisdaten">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
                      <div>
                        <p className="text-neutral-500">Land</p>
                        <p className="font-medium text-neutral-900">{team.country || "–"}</p>
                      </div>
                      <div>
                        <p className="text-neutral-500">Liga</p>
                        <p className="font-medium text-neutral-900">{team.league_name || "–"}</p>
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
                    <EntityCountsBlock teamId={teamId} />
                  </Card>
                </div>
              )}

              {active === "performance" && (
                <Card>
                  <EntityPerformancePanel teamId={teamId} mode="performance" />
                </Card>
              )}

              {active === "markets" && (
                <Card>
                  <EntityPerformancePanel teamId={teamId} mode="markets" />
                </Card>
              )}

              {active === "matches" && (
                <Card>
                  <TeamMatchesPanel teamId={teamId} />
                </Card>
              )}

              {active === "tips" && (
                <Card title="Alle Analysen">
                  <DataTable
                    columns={columns}
                    rows={tips}
                    rowKey={(t) => `${t.phase_two_scan_run_id}-${t.fixture_id}`}
                    emptyMessage="Keine Analysen für dieses Team gefunden"
                    onRowClick={(t) => router.push(`/football/matches/${encodeURIComponent(t.fixture_id)}`)}
                  />
                </Card>
              )}

              {active === "data" && (
                <Card>
                  <DataCoveragePanel teamId={teamId} />
                </Card>
              )}

              {active === "assets" && (
                <Card>
                  <AssetGallery type="team" id={teamId} imageSrc={imageSrc} entityName={team.name} onReplace={() => setShowUpload(true)} />
                </Card>
              )}

              {active === "technical" && (
                <Card title="Technische Details">
                  <div>
                    <p className="text-neutral-500">Team-ID</p>
                    <p className="font-mono text-xs text-neutral-500">{team.id}</p>
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
    </div>
  );
}
