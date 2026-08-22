"use client";

import { useCallback, useEffect, useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import DataTable, { Column } from "@/components/ui/DataTable";
import InfoTooltip from "@/components/ui/InfoTooltip";
import LoadingState from "@/components/ui/LoadingState";
import StateMessage from "@/components/ui/StateMessage";
import ConfirmDialog from "@/components/ConfirmDialog";
import type { AdminSession } from "@/lib/types";

type LoadState = "loading" | "loaded" | "forbidden" | "unreachable" | "error";

function fmt(value: unknown): string {
  if (value === null || value === undefined || value === "") return "–";
  return String(value);
}

function formatDateTime(value: unknown): string {
  if (value === null || value === undefined || value === "") return "–";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return `${date.toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" })} · ${date.toLocaleTimeString("de-DE", {
    timeZone: "Europe/Berlin",
    hour: "2-digit",
    minute: "2-digit",
  })} Uhr`;
}

interface EmployeeGroup {
  employee_name: string;
  employee_login: string;
  sessions: AdminSession[];
  lastCreated: string;
}

export default function OnlineStatusClient() {
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [revokeTarget, setRevokeTarget] = useState<AdminSession | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const res = await fetch("/api/security/sessions");
      if (res.status === 403) {
        setState("forbidden");
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
      setSessions(Array.isArray(data?.sessions) ? data.sessions : []);
      setState("loaded");
    } catch {
      setState("unreachable");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRevoke() {
    if (!revokeTarget) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/security/sessions/${encodeURIComponent(revokeTarget.token)}/revoke`, {
        method: "POST",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? `Fehler (Status ${res.status}).`);
        return;
      }
      setRevokeTarget(null);
      load();
    } catch {
      setError("Verbindung zum Backend fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  const byEmployee = new Map<number, AdminSession[]>();
  for (const s of sessions) {
    byEmployee.set(s.employee_id, [...(byEmployee.get(s.employee_id) ?? []), s]);
  }
  const groups: EmployeeGroup[] = Array.from(byEmployee.values()).map((group) => ({
    employee_name: group[0].employee_name,
    employee_login: group[0].employee_login,
    sessions: group,
    lastCreated: group.reduce((latest, s) => ((s.created_at ?? "") > latest ? s.created_at ?? latest : latest), group[0].created_at ?? ""),
  }));

  const columns: Column<EmployeeGroup>[] = [
    { header: "Mitarbeiter", cell: (r) => <span className="font-medium text-neutral-900">{r.employee_name}</span> },
    { header: "Login", cell: (r) => r.employee_login },
    { header: "Status", cell: () => <Badge tone="green">🟢 Online</Badge> },
    { header: "Aktive Sessions", cell: (r) => r.sessions.length },
    {
      header: "Letzte Aktivität",
      info: "Zeitpunkt der neuesten aktiven Sitzung dieses Mitarbeiters - es gibt kein separates Live-Aktivitäts-Tracking, nur den Login-Zeitpunkt.",
      cell: (r) => formatDateTime(r.lastCreated),
    },
    {
      header: "",
      cell: (r) => (
        <div className="flex flex-wrap gap-1.5">
          {r.sessions.map((s) => (
            <Button
              key={s.token}
              variant="danger"
              onClick={() => {
                setRevokeTarget(s);
                setError(null);
              }}
            >
              {r.sessions.length > 1 ? `Session beenden (${fmt(s.ip)})` : "Session beenden"}
            </Button>
          ))}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-1.5 text-xl font-semibold text-neutral-900">
          Online Status
          <InfoTooltip text="Zeigt, welche Mitarbeiter gerade eingeloggt sind." />
        </h1>
        <p className="text-sm text-neutral-400">
          Kein echtes Live-Anwesenheitssystem — &quot;Online&quot; bedeutet hier: mindestens eine aktive, noch gültige Sitzung.
        </p>
      </div>

      {state === "loading" && <LoadingState />}
      {state === "unreachable" && (
        <StateMessage
          title="PHÖNIX Backend nicht erreichbar"
          description="Die Verbindung zum Backend konnte nicht hergestellt werden."
          onRetry={load}
        />
      )}
      {state === "forbidden" && (
        <StateMessage title="Keine Berechtigung" description="Für dieses Konto liegt keine Berechtigung vor." />
      )}
      {state === "error" && (
        <StateMessage title="Online-Status konnte nicht geladen werden" description="Ein unerwarteter Fehler ist aufgetreten." onRetry={load} />
      )}

      {state === "loaded" && (
        <Card>
          <DataTable columns={columns} rows={groups} rowKey={(r) => r.employee_login} emptyMessage="Aktuell niemand online" />
        </Card>
      )}

      {revokeTarget && (
        <ConfirmDialog
          title="Session beenden"
          description={`Die Session von "${revokeTarget.employee_name}" (${fmt(revokeTarget.ip)}) wird sofort beendet.`}
          confirmLabel="Beenden"
          busy={busy}
          error={error}
          onConfirm={handleRevoke}
          onClose={() => setRevokeTarget(null)}
        />
      )}
    </div>
  );
}
