"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import DataTable, { Column } from "@/components/ui/DataTable";
import InfoTooltip from "@/components/ui/InfoTooltip";
import StateMessage from "@/components/ui/StateMessage";
import type { FootballTeamProfile } from "@/lib/types";

type LoadState = "loading" | "loaded" | "unreachable" | "error";

const PAGE_SIZE = 50;

export default function FootballTeamsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const search = searchParams.get("search") ?? "";
  const offset = Number(searchParams.get("offset") ?? "0") || 0;

  const [teams, setTeams] = useState<FootballTeamProfile[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [state, setState] = useState<LoadState>("loading");

  const load = useCallback(async () => {
    setState("loading");
    const qs = new URLSearchParams();
    if (search) qs.set("search", search);
    qs.set("limit", String(PAGE_SIZE));
    qs.set("offset", String(offset));
    try {
      const res = await fetch(`/api/football/teams?${qs.toString()}`);
      if (res.status === 502) {
        setState("unreachable");
        return;
      }
      if (!res.ok) {
        setState("error");
        return;
      }
      const data = await res.json().catch(() => null);
      setTeams(Array.isArray(data?.teams) ? data.teams : []);
      setCount(typeof data?.total === "number" ? data.total : null);
      setState("loaded");
    } catch {
      setState("unreachable");
    }
  }, [search, offset]);

  useEffect(() => {
    load();
  }, [load]);

  function updateParam(key: string, value: string) {
    const qs = new URLSearchParams(searchParams.toString());
    if (value) qs.set(key, value);
    else qs.delete(key);
    qs.delete("offset");
    router.replace(`/football/teams${qs.toString() ? `?${qs.toString()}` : ""}`);
  }

  function goToOffset(next: number) {
    const qs = new URLSearchParams(searchParams.toString());
    if (next > 0) qs.set("offset", String(next));
    else qs.delete("offset");
    router.replace(`/football/teams${qs.toString() ? `?${qs.toString()}` : ""}`);
  }

  const columns: Column<FootballTeamProfile>[] = [
    { header: "Team", cell: (t) => <span className="font-medium text-neutral-900">{t.name}</span> },
    { header: "Land", cell: (t) => t.country || "–" },
    { header: "Liga", cell: (t) => t.league_name || "–" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Breadcrumbs items={[{ label: "Teams" }]} />
        <h1 className="flex items-center gap-1.5 text-xl font-semibold text-neutral-900">
          Teams
          <InfoTooltip text="Alle Fußball-Mannschaften, die in gespeicherten Spielen vorkommen. Klick auf ein Team für Analysen, Performance und Wappen." />
        </h1>
        <p className="text-sm text-neutral-400">Team-Übersicht mit Analysen, Performance und Wappen-Verwaltung.</p>
      </div>

      <div>
        <label htmlFor="team-search" className="mb-1 block text-xs font-medium text-neutral-600">
          Suche
        </label>
        <input
          id="team-search"
          defaultValue={search}
          className="w-72 rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-900 focus:border-phoenix-gold focus:outline-none focus:ring-1 focus:ring-phoenix-gold"
          onBlur={(e) => updateParam("search", e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") updateParam("search", (e.target as HTMLInputElement).value);
          }}
        />
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
          <>
            <DataTable
              columns={columns}
              rows={teams}
              rowKey={(t) => t.id}
              emptyMessage="Keine Teams gefunden"
              onRowClick={(t) => router.push(`/football/teams/${encodeURIComponent(t.id)}`)}
            />
            {teams.length > 0 && (
              <div className="mt-3 flex items-center justify-between text-xs text-neutral-400">
                <span>
                  {count != null ? `${offset + 1}–${offset + teams.length} von ${count}` : `${teams.length} Einträge`}
                </span>
                <div className="flex gap-2">
                  <Button variant="secondary" disabled={offset === 0} onClick={() => goToOffset(Math.max(0, offset - PAGE_SIZE))}>
                    Zurück
                  </Button>
                  <Button variant="secondary" disabled={teams.length < PAGE_SIZE} onClick={() => goToOffset(offset + PAGE_SIZE)}>
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
