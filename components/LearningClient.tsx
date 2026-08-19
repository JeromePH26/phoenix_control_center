"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import DataTable, { Column } from "@/components/ui/DataTable";
import KeyValueList from "@/components/ui/KeyValueList";
import StateMessage from "@/components/ui/StateMessage";
import ConfirmDialog from "@/components/ConfirmDialog";
import type { EligibilityAudit, LearningRun, ModelLabOverview } from "@/lib/types";

type LoadState = "loading" | "loaded" | "unreachable" | "error";

function statusTone(status: string): "green" | "red" | "gold" | "neutral" {
  if (status === "completed") return "green";
  if (status === "failed") return "red";
  if (status === "running") return "gold";
  return "neutral";
}

function fmt(value: unknown): string {
  if (value === null || value === undefined || value === "") return "–";
  return String(value);
}

export default function LearningClient() {
  const [overview, setOverview] = useState<ModelLabOverview | null>(null);
  const [audit, setAudit] = useState<EligibilityAudit | null>(null);
  const [runs, setRuns] = useState<LearningRun[]>([]);
  const [state, setState] = useState<LoadState>("loading");

  const [confirmStart, setConfirmStart] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const [overviewRes, auditRes, runsRes] = await Promise.all([
        fetch("/api/model-lab/overview"),
        fetch("/api/model-lab/dry-run"),
        fetch("/api/model-lab/learning-runs?limit=5"),
      ]);
      if (overviewRes.status === 502) {
        setState("unreachable");
        return;
      }
      if (!overviewRes.ok) {
        setState("error");
        return;
      }
      setOverview(await overviewRes.json().catch(() => null));
      if (auditRes.ok) setAudit(await auditRes.json().catch(() => null));
      if (runsRes.ok) {
        const data = await runsRes.json().catch(() => null);
        setRuns(Array.isArray(data?.runs) ? data.runs : []);
      }
      setState("loaded");
    } catch {
      setState("unreachable");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleStart() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/model-lab/learning-runs", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? `Fehler (Status ${res.status}).`);
        return;
      }
      setConfirmStart(false);
      load();
    } catch {
      setError("Verbindung zum Backend fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  const runColumns: Column<LearningRun>[] = [
    { header: "ID", cell: (r) => <span className="font-medium text-neutral-900">#{r.id}</span> },
    { header: "Status", cell: (r) => <Badge tone={statusTone(r.status)}>{r.status}</Badge> },
    { header: "Auslöser", cell: (r) => fmt(r.trigger_type) },
    { header: "Ligen / Märkte", cell: (r) => `${fmt(r.leagues_processed)} / ${fmt(r.markets_processed)}` },
    { header: "Challenger erstellt", cell: (r) => fmt(r.challengers_created) },
    { header: "Gestartet", cell: (r) => fmt(r.started_at) },
  ];

  const perLeagueColumns: Column<EligibilityAudit["perLeague"][number]>[] = [
    { header: "Liga", cell: (l) => l.leagueId },
    { header: "Gespeichert", cell: (l) => l.storedSnapshots },
    { header: "Whitelisted", cell: (l) => l.whitelisted },
    { header: "Settled", cell: (l) => l.settled },
    { header: "Eligible", cell: (l) => l.eligible },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Learning</h1>
        <p className="text-sm text-neutral-400">Statistisches Modell-Learning — keine generative KI (Section 56/97).</p>
      </div>

      {state === "loading" && <p className="text-sm text-neutral-400">Wird geladen…</p>}
      {state === "unreachable" && (
        <StateMessage title="PHÖNIX Backend nicht erreichbar" description="Die Verbindung zum Backend konnte nicht hergestellt werden." />
      )}
      {state === "error" && (
        <StateMessage title="Learning-Status konnte nicht geladen werden" description="Ein unerwarteter Fehler ist aufgetreten." />
      )}

      {state === "loaded" && overview && (
        <>
          <Card
            title="Status"
            action={
              <div className="flex gap-1.5">
                <Badge tone="green">Generative AI: {overview.generativeAi ?? "OFF"}</Badge>
                <Badge tone={overview.promotionEnabled ? "gold" : "neutral"}>
                  Promotion: {overview.promotionEnabled ? "aktiviert" : "deaktiviert"}
                </Badge>
              </div>
            }
          >
            <KeyValueList
              data={{
                "Whitelist-Ligen": overview.whitelistLeagues,
                "Aktive Champions": overview.activeChampions,
                "Aktive Challenger": overview.activeChallengers,
                "Shadow Predictions": overview.shadowPredictions,
                "Lernfähige Matches": overview.learningEligibleMatches,
                "Nächster Learning-Run (Berlin)": overview.nextLearningRunBerlin,
                "Nächstes Champion-Review (Berlin)": overview.nextChampionReviewBerlin,
              }}
            />
          </Card>

          {audit && (
            <Card title="Eligibility-Audit (Dry-Run)" action={<span className="text-xs text-neutral-400">Rein lesend</span>}>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-md border border-neutral-100 bg-neutral-50 px-3 py-2.5">
                  <p className="text-xs text-neutral-500">Gespeicherte Snapshots</p>
                  <p className="mt-0.5 text-xl font-semibold text-neutral-900">{audit.totalStoredSnapshots}</p>
                </div>
                <div className="rounded-md border border-neutral-100 bg-neutral-50 px-3 py-2.5">
                  <p className="text-xs text-neutral-500">Eligible</p>
                  <p className="mt-0.5 text-xl font-semibold text-neutral-900">{audit.eligible}</p>
                </div>
                <div className="rounded-md border border-neutral-100 bg-neutral-50 px-3 py-2.5">
                  <p className="text-xs text-neutral-500">Not Eligible</p>
                  <p className="mt-0.5 text-xl font-semibold text-neutral-900">{audit.notEligible}</p>
                </div>
              </div>
              {Object.keys(audit.exclusionsByReason ?? {}).length > 0 && (
                <div className="mt-4">
                  <p className="mb-1 text-xs font-medium text-neutral-600">Ausschlussgründe</p>
                  <KeyValueList data={audit.exclusionsByReason} />
                </div>
              )}
              <div className="mt-4">
                <DataTable
                  columns={perLeagueColumns}
                  rows={audit.perLeague ?? []}
                  rowKey={(l) => l.leagueId}
                  emptyMessage="Keine Liga-Daten"
                />
              </div>
            </Card>
          )}

          <Card title="Learning-Run starten" action={<span className="text-xs text-neutral-400">Gleiche Logik wie der Dienstags-Job</span>}>
            <Button onClick={() => setConfirmStart(true)}>Jetzt starten</Button>
          </Card>

          <Card title="Letzte Läufe" action={<Link href="/model-lab/learning-runs" className="text-xs text-phoenix-gold-dark hover:underline">Alle anzeigen</Link>}>
            <DataTable columns={runColumns} rows={runs} rowKey={(r) => String(r.id)} emptyMessage="Noch keine Läufe" />
          </Card>
        </>
      )}

      {confirmStart && (
        <ConfirmDialog
          title="Learning-Run starten"
          description="Startet einen manuellen Learning-Run für alle Whitelist-Ligen × Märkte (trigger_type=manual). Läuft asynchron im Hintergrund."
          confirmLabel="Starten"
          busy={busy}
          error={error}
          onConfirm={handleStart}
          onClose={() => setConfirmStart(false)}
        />
      )}
    </div>
  );
}
