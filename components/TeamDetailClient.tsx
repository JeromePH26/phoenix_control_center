"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import DataTable, { Column } from "@/components/ui/DataTable";
import InfoTooltip from "@/components/ui/InfoTooltip";
import StateMessage from "@/components/ui/StateMessage";
import Badge from "@/components/ui/Badge";
import UploadAssetModal from "@/components/UploadAssetModal";
import EntityPerformancePanel from "@/components/EntityPerformancePanel";
import DataCoveragePanel from "@/components/DataCoveragePanel";
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

  return (
    <div className="space-y-6">
      <div>
        <Link href="/football/teams" className="text-xs text-neutral-400 hover:text-neutral-600">
          ← Zurück zu Teams
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-neutral-900">{team?.name ?? "Team"}</h1>
      </div>

      {state === "loading" && <p className="text-sm text-neutral-400">Wird geladen…</p>}
      {state === "notfound" && <StateMessage title="Team nicht gefunden" description="Für diese ID liegen keine Daten vor." />}
      {state === "unreachable" && (
        <StateMessage title="PHÖNIX Backend nicht erreichbar" description="Die Verbindung zum Backend konnte nicht hergestellt werden." />
      )}
      {state === "error" && <StateMessage title="Team konnte nicht geladen werden" description="Ein unerwarteter Fehler ist aufgetreten." />}

      {state === "loaded" && team && (
        <>
          <Card title="Übersicht">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-md border border-neutral-100 bg-neutral-50">
                {imageSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imageSrc} alt={team.name} className="h-full w-full object-contain p-1" />
                ) : (
                  <span className="text-xs text-neutral-300">Kein Bild</span>
                )}
              </div>
              <div className="grid flex-1 grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
                <div>
                  <p className="text-neutral-500">Land</p>
                  <p className="font-medium text-neutral-900">{team.country || "–"}</p>
                </div>
                <div>
                  <p className="text-neutral-500">Liga</p>
                  <p className="font-medium text-neutral-900">{team.league_name || "–"}</p>
                </div>
                <div>
                  <p className="text-neutral-500">Team-ID</p>
                  <p className="font-mono text-xs text-neutral-500">{team.id}</p>
                </div>
              </div>
              <Button variant="secondary" onClick={() => setShowUpload(true)}>
                Bild ersetzen
              </Button>
            </div>
          </Card>

          <Card
            title={
              <span className="inline-flex items-center gap-1">
                Performance
                <InfoTooltip text="Wie gut PHÖNIX-Tipps bei Spielen mit diesem Team bisher abgeschnitten haben - aus denselben Daten wie die Tipps-Übersicht." />
              </span>
            }
          >
            <EntityPerformancePanel teamId={teamId} />
          </Card>

          <Card
            title={
              <span className="inline-flex items-center gap-1">
                Daten
                <InfoTooltip text="Was hat PHÖNIX tatsächlich über dieses Team gespeichert - je Datenkategorie über alle gescannten Spiele." />
              </span>
            }
          >
            <DataCoveragePanel teamId={teamId} />
          </Card>

          <Card title="Alle Analysen">
            <DataTable
              columns={columns}
              rows={tips}
              rowKey={(t) => `${t.phase_two_scan_run_id}-${t.fixture_id}`}
              emptyMessage="Keine Analysen für dieses Team gefunden"
            />
          </Card>
        </>
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
