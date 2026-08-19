"use client";

import { useCallback, useEffect, useState } from "react";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import DataTable, { Column } from "@/components/ui/DataTable";
import StateMessage from "@/components/ui/StateMessage";
import type { FootballAsset } from "@/lib/types";

type LoadState = "loading" | "loaded" | "unreachable" | "error";

function statusTone(status: string): "green" | "red" | "gold" | "neutral" {
  if (status === "OK") return "green";
  if (status === "MISSING") return "red";
  if (status === "STALE") return "gold";
  return "neutral";
}

/**
 * There is no dedicated /api/admin/football/teams endpoint yet. This list
 * is derived from the asset inventory (team logos), which is the only
 * source of team identities currently exposed by the backend. Roster/
 * stammdaten are out of scope until a real teams endpoint exists.
 */
export default function FootballTeamsClient() {
  const [teams, setTeams] = useState<FootballAsset[]>([]);
  const [state, setState] = useState<LoadState>("loading");

  const load = useCallback(async () => {
    setState("loading");
    try {
      const res = await fetch("/api/football/assets");
      if (res.status === 502) {
        setState("unreachable");
        return;
      }
      if (!res.ok) {
        setState("error");
        return;
      }
      const data = await res.json().catch(() => null);
      const all: FootballAsset[] = Array.isArray(data) ? data : (data?.assets ?? []);
      setTeams(all.filter((a) => a.type?.toLowerCase() === "team"));
      setState("loaded");
    } catch {
      setState("unreachable");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const columns: Column<FootballAsset>[] = [
    { header: "Team", cell: (t) => <span className="font-medium text-neutral-900">{t.entityName ?? t.id}</span> },
    { header: "ID", cell: (t) => t.id },
    { header: "Wappen-Status", cell: (t) => <Badge tone={statusTone(t.status)}>{t.status}</Badge> },
    { header: "Aktualisiert", cell: (t) => t.updatedAt ?? "–" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Teams</h1>
        <p className="text-sm text-neutral-400">
          Team-Übersicht, abgeleitet aus dem Wappen- &amp; Asset-Bestand. Für Kader- oder Stammdaten steht noch
          kein eigener Endpunkt zur Verfügung.
        </p>
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
          <DataTable columns={columns} rows={teams} rowKey={(t) => t.id} emptyMessage="Keine Teams gefunden" />
        )}
      </Card>
    </div>
  );
}
