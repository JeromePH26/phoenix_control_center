"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import Badge from "@/components/ui/Badge";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import DataTable, { Column } from "@/components/ui/DataTable";
import InfoTooltip from "@/components/ui/InfoTooltip";
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

const KNOWN_KEYS = new Set([
  "leagueId",
  "name",
  "manualStatus",
  "league_id",
  "league_name",
  "manual_status",
  "country",
  "competition_level",
  "total_samples",
  "successful_full_analyses",
  "historical_status",
  "last_seen_at",
  "seasons",
  "gender",
  "has_logo",
]);

const HISTORICAL_STATUS_LABEL: Record<string, string> = {
  active: "Aktiv",
  inactive: "Inaktiv",
  archived: "Archiviert",
};

function levelLabel(level: unknown): string {
  const n = typeof level === "number" ? level : null;
  if (n === 1) return "1. Liga (Top)";
  if (n === 2) return "2. Liga";
  if (n === 3) return "3. Liga";
  if (n == null) return "Pokal / International";
  return `Stufe ${n}`;
}

function formatLastSeen(value: unknown): string {
  if (typeof value !== "string" || !value) return "–";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "–";
  return date.toLocaleDateString("de-DE");
}

export default function FootballLeaguesClient() {
  const router = useRouter();
  const [leagues, setLeagues] = useState<FootballLeague[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [pending, setPending] = useState<{ league: FootballLeague; status: LeagueManualStatus } | null>(null);
  const [pendingReason, setPendingReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [logoFilter, setLogoFilter] = useState<"" | "present" | "missing">("");
  const [countryFilter, setCountryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | LeagueManualStatus>("");
  const [sortBy, setSortBy] = useState<"name" | "country" | "lastSeen" | "samples">("name");

  const countries = useMemo(() => {
    const set = new Set<string>();
    for (const l of leagues) {
      if (typeof l.country === "string" && l.country) set.add(l.country);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "de"));
  }, [leagues]);

  const filteredLeagues = useMemo(() => {
    let rows = leagues;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(
        (l) => l.name?.toLowerCase().includes(q) || l.leagueId?.toLowerCase().includes(q) || String(l.country ?? "").toLowerCase().includes(q)
      );
    }
    if (logoFilter === "present") rows = rows.filter((l) => l.has_logo === true);
    if (logoFilter === "missing") rows = rows.filter((l) => l.has_logo !== true);
    if (countryFilter) rows = rows.filter((l) => l.country === countryFilter);
    if (statusFilter) rows = rows.filter((l) => l.manualStatus === statusFilter);

    const sorted = [...rows];
    sorted.sort((a, b) => {
      if (sortBy === "country") return String(a.country ?? "").localeCompare(String(b.country ?? ""), "de");
      if (sortBy === "lastSeen") return String(b.last_seen_at ?? "").localeCompare(String(a.last_seen_at ?? ""));
      if (sortBy === "samples") return (Number(b.total_samples) || 0) - (Number(a.total_samples) || 0);
      return (a.name ?? a.leagueId).localeCompare(b.name ?? b.leagueId, "de");
    });
    return sorted;
  }, [leagues, search, logoFilter, countryFilter, statusFilter, sortBy]);

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
        body: JSON.stringify({ status: pending.status, reason: pendingReason }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? `Fehler (Status ${res.status}).`);
        return;
      }
      setPending(null);
      setPendingReason("");
      load();
    } catch {
      setError("Verbindung zum Backend fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  const columns: Column<FootballLeague>[] = [
    { header: "Liga", cell: (l) => <span className="font-medium text-neutral-900">{l.name ?? l.leagueId}</span> },
    { header: "Land", cell: (l) => (typeof l.country === "string" ? l.country : "–") },
    { header: "Stufe", cell: (l) => levelLabel(l.competition_level) },
    {
      header: "Status",
      info: "Auto = System entscheidet automatisch. Whitelist = manuell freigegeben, wird sicher angezeigt. Blacklist = manuell gesperrt, wird nie angezeigt.",
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
      header: "Historie",
      info: "Ob PHÖNIX diese Liga aktuell noch aktiv beobachtet oder nur noch historische Daten dazu vorliegen.",
      cell: (l) => {
        const status = typeof l.historical_status === "string" ? l.historical_status : undefined;
        return status ? (HISTORICAL_STATUS_LABEL[status] ?? status) : "–";
      },
    },
    { header: "Analysierte Samples", cell: (l) => (typeof l.total_samples === "number" ? l.total_samples : "0") },
    { header: "Zuletzt gesehen", cell: (l) => formatLastSeen(l.last_seen_at) },
    {
      header: "Logo",
      cell: (l) => <Badge tone={l.has_logo ? "green" : "neutral"}>{l.has_logo ? "Vorhanden" : "Fehlt"}</Badge>,
    },
    {
      header: "Technische Details",
      cell: (l) => {
        const extra = Object.fromEntries(Object.entries(l).filter(([k]) => !KNOWN_KEYS.has(k)));
        return Object.keys(extra).length > 0 ? <JsonViewer value={extra} label="Technische Details" /> : "–";
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
              onClick={(e) => {
                e.stopPropagation();
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
        <Breadcrumbs items={[{ label: "Ligen" }]} />
        <h1 className="flex items-center gap-1.5 text-xl font-semibold text-neutral-900">
          Ligen / Whitelist
          <InfoTooltip text="Whitelist = Liste erlaubter/freigegebener Ligen. Hier legst du fest, welche Ligen in der App sicher angezeigt werden dürfen." />
        </h1>
        <p className="text-sm text-neutral-400">Manueller Freigabe- und Sperrstatus je Liga. Klick auf eine Liga für Details.</p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="league-search" className="mb-1 block text-xs font-medium text-neutral-600">
            Suche (Name, ID, Land)
          </label>
          <input
            id="league-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-72 rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-900 focus:border-phoenix-gold focus:outline-none focus:ring-1 focus:ring-phoenix-gold"
          />
        </div>
        <div>
          <label htmlFor="league-logo-filter" className="mb-1 block text-xs font-medium text-neutral-600">
            Logo
          </label>
          <select
            id="league-logo-filter"
            value={logoFilter}
            onChange={(e) => setLogoFilter(e.target.value as "" | "present" | "missing")}
            className="rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm text-neutral-900 focus:border-phoenix-gold focus:outline-none focus:ring-1 focus:ring-phoenix-gold"
          >
            <option value="">Alle</option>
            <option value="present">Vorhanden</option>
            <option value="missing">Fehlt</option>
          </select>
        </div>
        <div>
          <label htmlFor="league-country-filter" className="mb-1 block text-xs font-medium text-neutral-600">
            Land
          </label>
          <select
            id="league-country-filter"
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            className="rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm text-neutral-900 focus:border-phoenix-gold focus:outline-none focus:ring-1 focus:ring-phoenix-gold"
          >
            <option value="">Alle</option>
            {countries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="league-status-filter" className="mb-1 block text-xs font-medium text-neutral-600">
            Status
          </label>
          <select
            id="league-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "" | LeagueManualStatus)}
            className="rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm text-neutral-900 focus:border-phoenix-gold focus:outline-none focus:ring-1 focus:ring-phoenix-gold"
          >
            <option value="">Alle</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="league-sort" className="mb-1 block text-xs font-medium text-neutral-600">
            Sortierung
          </label>
          <select
            id="league-sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "name" | "country" | "lastSeen" | "samples")}
            className="rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm text-neutral-900 focus:border-phoenix-gold focus:outline-none focus:ring-1 focus:ring-phoenix-gold"
          >
            <option value="name">Name</option>
            <option value="country">Land</option>
            <option value="lastSeen">Zuletzt gesehen</option>
            <option value="samples">Analysierte Samples</option>
          </select>
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
          <StateMessage title="Ligen konnten nicht geladen werden" description="Ein unerwarteter Fehler ist aufgetreten." />
        )}
        {state === "loaded" && (
          <DataTable
            columns={columns}
            rows={filteredLeagues}
            rowKey={(l) => l.leagueId}
            emptyMessage="Keine Ligen gefunden"
            onRowClick={(l) => router.push(`/football/leagues/${encodeURIComponent(l.leagueId)}`)}
          />
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
          onClose={() => {
            setPending(null);
            setPendingReason("");
          }}
          reason={pendingReason}
          onReasonChange={setPendingReason}
          reasonRequired
        />
      )}
    </div>
  );
}
