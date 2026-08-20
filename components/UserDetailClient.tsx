"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import InfoTooltip from "@/components/ui/InfoTooltip";
import KeyValueList from "@/components/ui/KeyValueList";
import StateMessage from "@/components/ui/StateMessage";
import type { PhoenixUserDetailResponse } from "@/lib/types";

type LoadState = "loading" | "loaded" | "notfound" | "unreachable" | "error";

const ACCOUNT_STATUS_LABEL: Record<string, string> = {
  PENDING_EMAIL_VERIFICATION: "E-Mail-Bestätigung ausstehend",
  ACTIVE: "Aktiv",
  SUSPENDED: "Gesperrt",
  PERMANENTLY_SUSPENDED: "Dauerhaft gesperrt",
  DELETION_PENDING: "Löschung beantragt",
  DELETED: "Gelöscht",
};
const ACCOUNT_TYPE_LABEL: Record<string, string> = { USER: "Nutzer", EMPLOYEE: "Mitarbeiter", OWNER: "Inhaber" };
const PREMIUM_SOURCE_LABEL: Record<string, string> = {
  GOOGLE_PLAY: "Google Play",
  WEBSITE: "Website",
  MANUAL: "Manuell",
  PROMOTION: "Aktion",
  STAFF: "Mitarbeiter-Zugriff",
  PARTNER: "Partner",
};
const BAN_DURATION_LABEL: Record<string, string> = {
  "1_HOUR": "1 Stunde",
  "24_HOURS": "24 Stunden",
  "7_DAYS": "7 Tage",
  "30_DAYS": "30 Tage",
  CUSTOM: "Individuell",
  PERMANENT: "Dauerhaft",
};

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "Keine Daten";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Keine Daten";
  return `${date.toLocaleDateString("de-DE")} · ${date.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  })} Uhr`;
}

const inputClass =
  "rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-900 focus:border-phoenix-gold focus:outline-none focus:ring-1 focus:ring-phoenix-gold";
const labelClass = "mb-1 block text-xs font-medium text-neutral-600";

export default function UserDetailClient({ userId }: { userId: string }) {
  const [detail, setDetail] = useState<PhoenixUserDetailResponse | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showGrant, setShowGrant] = useState(false);
  const [showBan, setShowBan] = useState(false);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(userId)}`);
      if (res.status === 404) {
        setState("notfound");
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
      const data = (await res.json().catch(() => null)) as PhoenixUserDetailResponse | null;
      setDetail(data);
      setState(data ? "loaded" : "notfound");
    } catch {
      setState("unreachable");
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  async function grantPremium(form: FormData) {
    setBusy(true);
    setError(null);
    try {
      const expiresAt = form.get("expiresAt")?.toString();
      const res = await fetch(`/api/users/${encodeURIComponent(userId)}/premium`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: form.get("source"),
          tier: form.get("tier") || undefined,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
          reason: form.get("reason"),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? `Fehler (Status ${res.status}).`);
        return;
      }
      setShowGrant(false);
      load();
    } catch {
      setError("Verbindung zum Backend fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  async function revokePremium(entitlementId: number) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(userId)}/premium/${entitlementId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? `Fehler (Status ${res.status}).`);
        return;
      }
      load();
    } catch {
      setError("Verbindung zum Backend fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  async function createBan(form: FormData) {
    setBusy(true);
    setError(null);
    try {
      const expiresAt = form.get("expiresAt")?.toString();
      const res = await fetch(`/api/users/${encodeURIComponent(userId)}/bans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: form.get("reason"),
          internalReport: form.get("internalReport"),
          durationType: form.get("durationType"),
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? `Fehler (Status ${res.status}).`);
        return;
      }
      setShowBan(false);
      load();
    } catch {
      setError("Verbindung zum Backend fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  async function liftBan(banId: number) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(userId)}/bans/${banId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Über Control Center aufgehoben" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? `Fehler (Status ${res.status}).`);
        return;
      }
      load();
    } catch {
      setError("Verbindung zum Backend fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  async function revokeSession(token: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/users/${encodeURIComponent(userId)}/sessions/${encodeURIComponent(token)}`,
        { method: "POST" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? `Fehler (Status ${res.status}).`);
        return;
      }
      load();
    } catch {
      setError("Verbindung zum Backend fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/users/accounts" className="text-xs text-neutral-400 hover:text-neutral-600">
          ← Zurück zu Nutzerkonten
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-neutral-900">Nutzerprofil</h1>
      </div>

      {state === "loading" && <p className="text-sm text-neutral-400">Wird geladen…</p>}
      {state === "notfound" && <StateMessage title="Nutzer nicht gefunden" description="Für diese ID liegen keine Daten vor." />}
      {state === "unreachable" && (
        <StateMessage title="PHÖNIX Backend nicht erreichbar" description="Die Verbindung zum Backend konnte nicht hergestellt werden." />
      )}
      {state === "error" && (
        <StateMessage title="Nutzer konnte nicht geladen werden" description="Ein unerwarteter Fehler ist aufgetreten." />
      )}

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {state === "loaded" && detail && (
        <>
          <Card title="Übersicht">
            <KeyValueList
              data={{
                "PHÖNIX-ID": detail.user.phoenix_user_id,
                "E-Mail": `${detail.user.email}${detail.user.email_verified ? " (bestätigt)" : " (nicht bestätigt)"}`,
                Benutzername: detail.user.username,
                Anzeigename: detail.user.display_name,
                Kontotyp: ACCOUNT_TYPE_LABEL[detail.user.account_type] ?? detail.user.account_type,
                Status: ACCOUNT_STATUS_LABEL[detail.user.account_status] ?? detail.user.account_status,
                Registriert: formatDateTime(detail.user.created_at as string),
                "Zuletzt aktiv": formatDateTime(detail.user.last_active_at as string | undefined),
              }}
            />
          </Card>

          <Card
            title={
              <span className="inline-flex items-center gap-1">
                Premium
                <InfoTooltip text="Alle Premiumquellen dieses Nutzers. Ein Nutzer gilt als Premium, sobald mindestens eine Quelle (außer Mitarbeiter-Zugriff) aktiv und nicht abgelaufen ist." />
              </span>
            }
            action={
              <Button variant="secondary" onClick={() => setShowGrant((v) => !v)}>
                {showGrant ? "Abbrechen" : "Premium vergeben"}
              </Button>
            }
          >
            {showGrant && (
              <form
                action={grantPremium}
                className="mb-4 space-y-3 rounded-md border border-neutral-100 bg-neutral-50 p-3"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Quelle</label>
                    <select name="source" required className={inputClass}>
                      <option value="MANUAL">Manuell</option>
                      <option value="PROMOTION">Aktion</option>
                      <option value="STAFF">Mitarbeiter-Zugriff</option>
                      <option value="PARTNER">Partner</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Stufe (optional)</label>
                    <input name="tier" className={inputClass} placeholder="z.B. standard" />
                  </div>
                  <div>
                    <label className={labelClass}>Läuft ab am (leer = unbegrenzt)</label>
                    <input type="datetime-local" name="expiresAt" className={inputClass} />
                  </div>
                  <div className="col-span-2">
                    <label className={labelClass}>Grund (Pflicht, für Audit-Log)</label>
                    <input name="reason" required className={inputClass} />
                  </div>
                </div>
                <Button type="submit" disabled={busy}>
                  Bestätigen
                </Button>
              </form>
            )}
            {detail.premiumEntitlements.length === 0 ? (
              <p className="text-sm text-neutral-400">Keine Premiumquellen vorhanden.</p>
            ) : (
              <div className="space-y-2">
                {detail.premiumEntitlements.map((e) => (
                  <div
                    key={e.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-neutral-100 px-3 py-2 text-sm"
                  >
                    <Badge tone={e.active ? "green" : "neutral"}>{e.active ? "Aktiv" : "Beendet"}</Badge>
                    <span className="font-medium text-neutral-900">
                      {PREMIUM_SOURCE_LABEL[e.source] ?? e.source}
                    </span>
                    <span className="text-neutral-500">
                      {e.expires_at ? `Bis ${formatDateTime(e.expires_at)}` : "Unbegrenzt"}
                    </span>
                    <span className="text-neutral-400">{e.reason}</span>
                    {e.active && (
                      <Button variant="secondary" disabled={busy} onClick={() => revokePremium(e.id)}>
                        Entziehen
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card
            title="Sperren"
            action={
              <Button variant="secondary" onClick={() => setShowBan((v) => !v)}>
                {showBan ? "Abbrechen" : "Sperren"}
              </Button>
            }
          >
            {showBan && (
              <form
                action={createBan}
                className="mb-4 space-y-3 rounded-md border border-neutral-100 bg-neutral-50 p-3"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Dauer</label>
                    <select name="durationType" required className={inputClass}>
                      {Object.entries(BAN_DURATION_LABEL).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Bis (nur bei &quot;Individuell&quot;)</label>
                    <input type="datetime-local" name="expiresAt" className={inputClass} />
                  </div>
                  <div className="col-span-2">
                    <label className={labelClass}>Grund (dem Nutzer ggf. mitgeteilt)</label>
                    <input name="reason" required className={inputClass} />
                  </div>
                  <div className="col-span-2">
                    <label className={labelClass}>Interner Bericht (nur intern sichtbar)</label>
                    <textarea name="internalReport" required className={`${inputClass} h-20`} />
                  </div>
                </div>
                <Button type="submit" disabled={busy}>
                  Sperre anlegen
                </Button>
              </form>
            )}
            {detail.bans.length === 0 ? (
              <p className="text-sm text-neutral-400">Keine Sperrfälle vorhanden.</p>
            ) : (
              <div className="space-y-2">
                {detail.bans.map((b) => (
                  <div key={b.id} className="rounded-md border border-neutral-100 px-3 py-2 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Badge tone={b.status === "ACTIVE" ? "red" : "neutral"}>
                        {b.status === "ACTIVE" ? "Aktiv" : b.status === "LIFTED" ? "Aufgehoben" : "Abgelaufen"}
                      </Badge>
                      <span className="font-mono text-xs text-neutral-400">{b.case_number}</span>
                      <span className="text-neutral-500">{BAN_DURATION_LABEL[b.duration_type] ?? b.duration_type}</span>
                      {b.status === "ACTIVE" && (
                        <Button variant="secondary" disabled={busy} onClick={() => liftBan(b.id)}>
                          Aufheben
                        </Button>
                      )}
                    </div>
                    <p className="mt-1 text-neutral-700">{b.reason}</p>
                    <p className="text-xs text-neutral-400">
                      Erstellt von {b.created_by_name ?? "–"} am {formatDateTime(b.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card
            title={
              <span className="inline-flex items-center gap-1">
                Sessions
                <InfoTooltip text="Aktive und vergangene Anmeldungen dieses Nutzers in der PHÖNIX-App." />
              </span>
            }
          >
            {detail.sessions.length === 0 ? (
              <p className="text-sm text-neutral-400">Keine Sessions vorhanden.</p>
            ) : (
              <div className="space-y-2">
                {detail.sessions.map((s) => {
                  const active = !s.revoked_at && new Date(s.expires_at) > new Date();
                  return (
                    <div
                      key={s.token}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-neutral-100 px-3 py-2 text-sm"
                    >
                      <Badge tone={active ? "green" : "neutral"}>{active ? "Aktiv" : "Beendet"}</Badge>
                      <span className="text-neutral-700">{s.platform ?? "–"} · {s.device_model ?? "–"}</span>
                      <span className="text-neutral-500">Angemeldet {formatDateTime(s.created_at)}</span>
                      {active && (
                        <Button variant="secondary" disabled={busy} onClick={() => revokeSession(s.token)}>
                          Abmelden
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card title="Supportfälle">
            {detail.supportTickets.length === 0 ? (
              <p className="text-sm text-neutral-400">Keine Supportfälle vorhanden.</p>
            ) : (
              <div className="space-y-2">
                {detail.supportTickets.map((t) => (
                  <Link
                    key={t.id}
                    href={`/support/tickets/${t.id}`}
                    className="block rounded-md border border-neutral-100 px-3 py-2 text-sm hover:bg-neutral-50"
                  >
                    <span className="font-medium text-neutral-900">{t.subject}</span>{" "}
                    <span className="text-neutral-400">· {formatDateTime(t.created_at)}</span>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
