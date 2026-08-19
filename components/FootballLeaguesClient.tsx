"use client";

import { useCallback, useEffect, useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import DataTable, { Column } from "@/components/ui/DataTable";
import JsonViewer from "@/components/ui/JsonViewer";
import StateMessage from "@/components/ui/StateMessage";
import ConfirmDialog from "@/components/ConfirmDialog";
import type { FootballLeague, LeagueManualStatus } from "@/lib/types";

type LoadState = "loading" | "loaded" | "unreachable" | "error";

const STATUS_LABEL: Record<LeagueManualStatus, string> = {
  auto: "Auto",
  whitelist: "Whitelist",
  blacklist: "Blacklist",
};

const STATUSES: LeagueManualStatus[] = ["auto", "whitelist", "blacklist"];

function statusTone(status: string | undefined): "green" | "red" | "neutral" {
  if (status === "whitelist") return "green";
  if (status === "blacklist") return "red";
  return "neutral";
}

const KNOWN_KEYS = new Set(["leagueId", "name", "manualStatus"]);

export default function FootballLeaguesClient() {
  const [leagues, setLeagues] = useState<FootballLeague[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [pending, setPending] = useState<{ league: FootballLeague; status: LeagueManualStatus } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const res = await fetch("/api/football/leagues");
      if (res.status === 502) {
        setState("unreachable");
        return;
      }
      if (!res.ok) {
        setState("error");
        return;
      }
      const data = await res.json().catch(() => null);
      setLeagues(Array.isArray(data) ? data : (data?.leagues ?? []));
      setState("loaded");
    } catch {
      setState("unreachable");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleConfirm() {
    if (!pending) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/football/leagues/${encodeURIComponent(pending.league.leagueId)}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: pending.status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? `Fehler (Status ${res.status}).`);
        return;
      }
      setPending(null);
      load();
    } catch {
      setError("Verbindung zum Backend fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  const columns: Column<FootballLeague>[] = [
    { header: "Liga", cell: (l) => <span className="font-medium text-neutral-900">{l.name ?? l.leagueId}</span> },
    { header: "Liga-ID", cell: (l) => l.leagueId },
    {
      header: "Status",
      cell: (l) => {
        const status = typeof l.manualStatus === "string" ? l.manualStatus : undefined;
        return (
          <Badge tone={statusTone(status)}>
            {status && status in STATUS_LABEL ? STATUS_LABEL[status as LeagueManualStatus] : (status ?? "–")}
          </Badge>
        );
      },
    },
    {
      header: "Details",
      cell: (l) => {
        const extra = Object.fromEntries(Object.entries(l).filter(([k]) => !KNOWN_KEYS.has(k)));
        return Object.keys(extra).length > 0 ? <JsonViewer value={extra} label="Details" /> : "–";
      },
    },
    {
      header: "",
      cell: (l) => (
        <div className="flex gap-1.5">
          {STATUSES.map((s) => (
            <Button
              key={s}
              variant={l.manualStatus === s ? "primary" : "secondary"}
              disabled={l.manualStatus === s}
              onClick={() => {
                setPending({ league: l, status: s });
                setError(null);
              }}
            >
              {STATUS_LABEL[s]}
            </Button>
          ))}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Ligen / Whitelist</h1>
        <p className="text-sm text-neutral-400">Manueller Freigabe- und Sperrstatus je Liga.</p>
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
          <StateMessage title="Ligen konnten nicht geladen werden" description="Ein unerwarteter Fehler ist aufgetreten." />
        )}
        {state === "loaded" && (
          <DataTable columns={columns} rows={leagues} rowKey={(l) => l.leagueId} emptyMessage="Keine Ligen gefunden" />
        )}
      </Card>

      {pending && (
        <ConfirmDialog
          title="Liga-Status ändern"
          description={`"${pending.league.name ?? pending.league.leagueId}" wird auf "${STATUS_LABEL[pending.status]}" gesetzt.`}
          confirmLabel="Bestätigen"
          busy={busy}
          error={error}
          onConfirm={handleConfirm}
          onClose={() => setPending(null)}
        />
      )}
    </div>
  );
}
