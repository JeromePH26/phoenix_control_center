"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import DataTable, { Column } from "@/components/ui/DataTable";
import InfoTooltip from "@/components/ui/InfoTooltip";
import LoadingState from "@/components/ui/LoadingState";
import StateMessage from "@/components/ui/StateMessage";
import ConfirmDialog from "@/components/ConfirmDialog";
import type { AdminSession, FailedLoginAttempt } from "@/lib/types";

type LoadState = "loading" | "loaded" | "unreachable" | "error";

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

const inputClass =
  "w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-900 focus:border-phoenix-gold focus:outline-none focus:ring-1 focus:ring-phoenix-gold";

function TwoFactorCard() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [setupSecret, setSetupSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDisable, setShowDisable] = useState(false);
  const [disableCode, setDisableCode] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/security/2fa/status");
      if (res.ok) {
        const data = await res.json().catch(() => null);
        setEnabled(!!data?.enabled);
      }
    } catch {
      // Section 32: 2FA-Status ist informativ, ein Fehler hier blockiert die restliche Seite nicht.
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function startSetup() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/security/2fa/setup", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? `Fehler (Status ${res.status}).`);
        return;
      }
      setSetupSecret(data.secret);
    } catch {
      setError("Verbindung zum Backend fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmSetup(e: FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/security/2fa/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? `Fehler (Status ${res.status}).`);
        return;
      }
      setSetupSecret(null);
      setCode("");
      setEnabled(true);
    } catch {
      setError("Verbindung zum Backend fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDisable() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/security/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: disableCode.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? `Fehler (Status ${res.status}).`);
        return;
      }
      setShowDisable(false);
      setDisableCode("");
      setEnabled(false);
    } catch {
      setError("Verbindung zum Backend fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card
      title={
        <span className="inline-flex items-center gap-1">
          Zwei-Faktor-Authentifizierung (2FA)
          <InfoTooltip text="Zusätzlicher Code aus einer Authenticator-App (z.B. Google Authenticator) beim Login, besonders für Owner/Admin empfohlen." />
        </span>
      }
      action={enabled == null ? undefined : <Badge tone={enabled ? "green" : "neutral"}>{enabled ? "Aktiv" : "Nicht aktiv"}</Badge>}
    >
      {enabled === false && !setupSecret && (
        <div>
          <p className="mb-3 text-sm text-neutral-600">
            Noch nicht eingerichtet für dieses Konto. Empfohlen für Owner/Admin-Rollen.
          </p>
          <Button onClick={startSetup} disabled={busy}>
            {busy ? "…" : "2FA einrichten"}
          </Button>
        </div>
      )}

      {setupSecret && (
        <form onSubmit={confirmSetup} className="space-y-3">
          <p className="text-sm text-neutral-600">
            Diesen Schlüssel in einer Authenticator-App manuell hinzufügen (&quot;Setup-Schlüssel eingeben&quot;, kein
            QR-Code nötig):
          </p>
          <p className="rounded-md bg-neutral-50 px-3 py-2 font-mono text-sm text-neutral-900">{setupSecret}</p>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Code aus der App zur Bestätigung</label>
            <input className={`${inputClass} w-40`} value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" />
          </div>
          <Button type="submit" disabled={busy || !code.trim()}>
            {busy ? "…" : "Bestätigen und aktivieren"}
          </Button>
        </form>
      )}

      {enabled === true && (
        <div>
          <p className="mb-3 text-sm text-neutral-600">2FA ist für dieses Konto aktiv.</p>
          <Button variant="danger" onClick={() => { setShowDisable(true); setError(null); }}>
            2FA deaktivieren
          </Button>
        </div>
      )}

      {error && !showDisable && (
        <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {showDisable && (
        <ConfirmDialog
          title="2FA deaktivieren"
          description="Zur Bestätigung bitte einen aktuellen Code aus der Authenticator-App eingeben."
          confirmLabel="Deaktivieren"
          busy={busy}
          error={error}
          reason={disableCode}
          onReasonChange={setDisableCode}
          reasonRequired
          onConfirm={handleDisable}
          onClose={() => { setShowDisable(false); setDisableCode(""); }}
        />
      )}
    </Card>
  );
}

export default function SecurityClient() {
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [history, setHistory] = useState<AdminSession[]>([]);
  const [failedLogins, setFailedLogins] = useState<FailedLoginAttempt[]>([]);
  const [state, setState] = useState<LoadState>("loading");

  const [revokeTarget, setRevokeTarget] = useState<AdminSession | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const [sessionsRes, failedRes, historyRes] = await Promise.all([
        fetch("/api/security/sessions"),
        fetch("/api/security/failed-logins"),
        fetch("/api/security/sessions/history"),
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
      if (historyRes.ok) {
        const historyData = await historyRes.json().catch(() => null);
        setHistory(Array.isArray(historyData?.sessions) ? historyData.sessions : []);
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
    { header: "IP", info: "Die Internet-Adresse des Geräts, von dem aus eingeloggt wurde.", cell: (s) => fmt(s.ip) },
    {
      header: "Gerät",
      info: "Technische Kennung von Browser/Betriebssystem, mit dem eingeloggt wurde.",
      cell: (s) => <span className="text-xs text-neutral-500">{fmt(s.user_agent)}</span>,
    },
    { header: "Erstellt", cell: (s) => formatDateTime(s.created_at) },
    { header: "Läuft ab", info: "Nach diesem Zeitpunkt ist die Sitzung automatisch ungültig, auch ohne manuelles Beenden.", cell: (s) => formatDateTime(s.expires_at) },
    {
      header: "",
      cell: (s) => (
        <Button variant="danger" onClick={() => { setRevokeTarget(s); setError(null); }}>
          Beenden
        </Button>
      ),
    },
  ];

  const historyColumns: Column<AdminSession>[] = [
    { header: "Mitarbeiter", cell: (s) => `${s.employee_name} (${s.employee_login})` },
    { header: "IP", cell: (s) => fmt(s.ip) },
    { header: "Login", cell: (s) => formatDateTime(s.created_at) },
    {
      header: "Status",
      cell: (s) =>
        s.active ? (
          <Badge tone="green">Aktiv</Badge>
        ) : s.revoked_at ? (
          <Badge tone="neutral">Beendet</Badge>
        ) : (
          <Badge tone="neutral">Abgelaufen</Badge>
        ),
    },
  ];

  const failedColumns: Column<FailedLoginAttempt>[] = [
    { header: "Login", cell: (f) => f.login },
    { header: "IP", info: "Die Internet-Adresse, von der aus der Login-Versuch kam.", cell: (f) => fmt(f.ip) },
    { header: "Zeitpunkt", cell: (f) => formatDateTime(f.attempted_at) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-1.5 text-xl font-semibold text-neutral-900">
          Security
          <InfoTooltip text="Wer gerade eingeloggt ist (aktive Sitzungen), wer sich zuletzt erfolglos einzuloggen versucht hat, und 2FA für dieses Konto." />
        </h1>
        <p className="text-sm text-neutral-400">
          Aktive Sessions, Login-Verlauf und fehlgeschlagene Login-Versuche. Nach 10 fehlgeschlagenen Versuchen
          innerhalb von 15 Minuten wird ein Login-Name vorübergehend gesperrt (Rate Limit). Geräteerkennung ist noch
          nicht umgesetzt.
        </p>
      </div>

      <TwoFactorCard />

      {state === "loading" && <LoadingState />}
      {state === "unreachable" && (
        <StateMessage
          title="PHÖNIX Backend nicht erreichbar"
          description="Die Verbindung zum Backend konnte nicht hergestellt werden."
          onRetry={load}
        />
      )}
      {state === "error" && (
        <StateMessage title="Sicherheitsdaten konnten nicht geladen werden" description="Ein unerwarteter Fehler ist aufgetreten." onRetry={load} />
      )}

      {state === "loaded" && (
        <>
          <Card title="Aktive Sessions" action={<Badge tone="neutral">{sessions.length}</Badge>}>
            <DataTable columns={sessionColumns} rows={sessions} rowKey={(s) => s.token} emptyMessage="Keine aktiven Sessions" />
          </Card>

          <Card
            title={
              <span className="inline-flex items-center gap-1">
                Login-Verlauf
                <InfoTooltip text="Alle Logins der letzten Zeit, auch bereits abgelaufene oder manuell beendete Sessions." />
              </span>
            }
            action={<Badge tone="neutral">{history.length}</Badge>}
          >
            <DataTable columns={historyColumns} rows={history} rowKey={(s) => `${s.token}-${s.created_at}`} emptyMessage="Kein Login-Verlauf" />
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
