"use client";

import { useCallback, useEffect, useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import DataTable, { Column } from "@/components/ui/DataTable";
import StateMessage from "@/components/ui/StateMessage";
import ConfirmDialog from "@/components/ConfirmDialog";
import type { AdminSession, FailedLoginAttempt } from "@/lib/types";

type LoadState = "loading" | "loaded" | "unreachable" | "error";

function fmt(value: unknown): string {
  if (value === null || value === undefined || value === "") return "–";
  return String(value);
}

export default function SecurityClient() {
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [failedLogins, setFailedLogins] = useState<FailedLoginAttempt[]>([]);
  const [state, setState] = useState<LoadState>("loading");

  const [revokeTarget, setRevokeTarget] = useState<AdminSession | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const [sessionsRes, failedRes] = await Promise.all([
        fetch("/api/security/sessions"),
        fetch("/api/security/failed-logins"),
      ]);
      if (sessionsRes.status === 502) {
        setState("unreachable");
        return;
      }
      if (!sessionsRes.ok) {
        setState("error");
        return;
      }
      const sessionsData = await sessionsRes.json().catch(() => null);
      setSessions(Array.isArray(sessionsData?.sessions) ? sessionsData.sessions : []);
      if (failedRes.ok) {
        const failedData = await failedRes.json().catch(() => null);
        setFailedLogins(Array.isArray(failedData?.attempts) ? failedData.attempts : []);
      }
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

  const sessionColumns: Column<AdminSession>[] = [
    { header: "Mitarbeiter", cell: (s) => `${s.employee_name} (${s.employee_login})` },
    { header: "IP", cell: (s) => fmt(s.ip) },
    { header: "Gerät", cell: (s) => <span className="text-xs text-neutral-500">{fmt(s.user_agent)}</span> },
    { header: "Erstellt", cell: (s) => fmt(s.created_at) },
    { header: "Läuft ab", cell: (s) => fmt(s.expires_at) },
    {
      header: "",
      cell: (s) => (
        <Button variant="danger" onClick={() => { setRevokeTarget(s); setError(null); }}>
          Beenden
        </Button>
      ),
    },
  ];

  const failedColumns: Column<FailedLoginAttempt>[] = [
    { header: "Login", cell: (f) => f.login },
    { header: "IP", cell: (f) => fmt(f.ip) },
    { header: "Zeitpunkt", cell: (f) => fmt(f.attempted_at) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Security</h1>
        <p className="text-sm text-neutral-400">
          Aktive Sessions und fehlgeschlagene Login-Versuche. 2FA und Geräteerkennung sind noch nicht umgesetzt.
        </p>
      </div>

      {state === "loading" && <p className="text-sm text-neutral-400">Wird geladen…</p>}
      {state === "unreachable" && (
        <StateMessage title="PHÖNIX Backend nicht erreichbar" description="Die Verbindung zum Backend konnte nicht hergestellt werden." />
      )}
      {state === "error" && (
        <StateMessage title="Sicherheitsdaten konnten nicht geladen werden" description="Ein unerwarteter Fehler ist aufgetreten." />
      )}

      {state === "loaded" && (
        <>
          <Card title="Aktive Sessions" action={<Badge tone="neutral">{sessions.length}</Badge>}>
            <DataTable columns={sessionColumns} rows={sessions} rowKey={(s) => s.token} emptyMessage="Keine aktiven Sessions" />
          </Card>

          <Card title="Fehlgeschlagene Login-Versuche" action={<Badge tone="neutral">{failedLogins.length}</Badge>}>
            <DataTable columns={failedColumns} rows={failedLogins} rowKey={(f) => `${f.login}-${f.attempted_at}`} emptyMessage="Keine fehlgeschlagenen Versuche" />
          </Card>
        </>
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
