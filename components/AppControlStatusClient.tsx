"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import InfoTooltip from "@/components/ui/InfoTooltip";
import KeyValueList from "@/components/ui/KeyValueList";
import LoadingState from "@/components/ui/LoadingState";
import Modal from "@/components/ui/Modal";
import StateMessage from "@/components/ui/StateMessage";
import type { AppControlStatus, AppControlStatusValue } from "@/lib/types";

type LoadState = "loading" | "loaded" | "unreachable" | "forbidden" | "error";

const STATUSES: { value: AppControlStatusValue; label: string; tone: "green" | "gold" | "red" }[] = [
  { value: "ACTIVE", label: "Aktiv", tone: "green" },
  { value: "MAINTENANCE", label: "Wartungsmodus", tone: "gold" },
  { value: "DISABLED", label: "Abgeschaltet", tone: "red" },
];

function toneFor(status: string): "green" | "gold" | "red" | "neutral" {
  return STATUSES.find((s) => s.value === status)?.tone ?? "neutral";
}

function labelFor(status: string): string {
  return STATUSES.find((s) => s.value === status)?.label ?? status;
}

function formatDateTime(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" })} · ${date.toLocaleTimeString("de-DE", {
    timeZone: "Europe/Berlin",
    hour: "2-digit",
    minute: "2-digit",
  })} Uhr`;
}

export default function AppControlStatusClient() {
  const [status, setStatus] = useState<AppControlStatus | null>(null);
  const [state, setState] = useState<LoadState>("loading");

  const [target, setTarget] = useState<AppControlStatusValue | null>(null);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [maintenanceUntil, setMaintenanceUntil] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const res = await fetch("/api/app-control/status");
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
      setStatus(data);
      setState("loaded");
    } catch {
      setState("unreachable");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openDialog(value: AppControlStatusValue) {
    setTarget(value);
    setReason("");
    setMessage(status?.message ?? "");
    setMaintenanceUntil(status?.maintenance_until ? status.maintenance_until.slice(0, 16) : "");
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!target || !reason.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/app-control/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: target,
          reason: reason.trim(),
          message: message.trim() || undefined,
          maintenanceUntil: target === "MAINTENANCE" && maintenanceUntil ? new Date(maintenanceUntil).toISOString() : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? `Fehler (Status ${res.status}).`);
        return;
      }
      setTarget(null);
      load();
    } catch {
      setError("Verbindung zum Backend fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    "w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-900 focus:border-phoenix-gold focus:outline-none focus:ring-1 focus:ring-phoenix-gold";
  const labelClass = "mb-1 block text-xs font-medium text-neutral-600";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-1.5 text-xl font-semibold text-neutral-900">
          App Status
          <InfoTooltip text="Der zentrale Schalter für die ganze App. Bei Wartung oder einem Notfall kann hier die gesamte App für alle Nutzer auf 'Wartung' oder 'Abgeschaltet' gestellt werden." />
        </h1>
        <p className="text-sm text-neutral-400">
          Zentraler App-Status: Aktiv (normaler Betrieb) / Wartungsmodus (App zeigt Nutzern einen Hinweis) / Abgeschaltet.
          Die App fragt diesen Status regelmäßig beim Start und alle 5 Minuten ab.
        </p>
        <p className="mt-1 rounded-md border border-dashed border-neutral-300 bg-neutral-50 px-3 py-2 text-xs text-neutral-500">
          Betrifft ausschließlich die App-Oberfläche der Nutzer. Backend-Arbeit (Daily-Pipeline, Settlement,
          Live-Übertragung) läuft unabhängig von diesem Status weiter — auch bei &quot;Abgeschaltet&quot; muss die
          Arbeit separat gestoppt werden (App Control → Module).
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
        <StateMessage title="Keine Berechtigung" description="Für dieses Konto liegt keine Berechtigung für App Control vor." />
      )}
      {state === "error" && (
        <StateMessage title="Status konnte nicht geladen werden" description="Ein unerwarteter Fehler ist aufgetreten." onRetry={load} />
      )}

      {state === "loaded" && status && (
        <>
          <Card title="Aktueller Status" action={<Badge tone={toneFor(status.status)}>{labelFor(status.status)}</Badge>}>
            <KeyValueList
              data={{
                Nachricht: status.message ?? null,
                "Geplantes Ende": status.status === "MAINTENANCE" ? formatDateTime(status.maintenance_until) : null,
                "Zuletzt geändert": formatDateTime(status.updated_at),
                "Geändert von": status.updated_by ?? null,
              }}
              info={{
                Nachricht: "Text, der Nutzern in der App angezeigt wird, z.B. ein Hinweis während der Wartung.",
                "Geplantes Ende": "Rein informativ - schaltet nicht automatisch zurück auf Aktiv.",
              }}
            />
            {status.status === "MAINTENANCE" && status.message && (
              <div className="mt-3">
                <p className="mb-1 text-xs font-medium text-neutral-600">Vorschau (Nutzeransicht)</p>
                <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">
                  <p className="mb-1 font-medium text-neutral-900">Wartungsarbeiten</p>
                  <p>{status.message}</p>
                </div>
              </div>
            )}
          </Card>

          <Card title="Status ändern" action={<span className="text-xs text-neutral-400">Jede Änderung erfordert einen Grund</span>}>
            <div className="flex flex-wrap gap-2">
              {STATUSES.map((s) => (
                <Button
                  key={s.value}
                  variant={status.status === s.value ? "primary" : "secondary"}
                  disabled={status.status === s.value}
                  onClick={() => openDialog(s.value)}
                >
                  {s.label}
                </Button>
              ))}
            </div>
          </Card>
        </>
      )}

      {target && (
        <Modal title={`Status auf "${STATUSES.find((s) => s.value === target)?.label}" setzen`} onClose={() => setTarget(null)}>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label htmlFor="app-status-reason" className={labelClass}>
                Grund (erforderlich)
              </label>
              <input
                id="app-status-reason"
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="app-status-message" className={labelClass}>
                Nachricht für Nutzer (optional, z.B. Wartungshinweis)
              </label>
              <textarea
                id="app-status-message"
                rows={2}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className={inputClass}
              />
            </div>
            {message.trim() && (
              <div>
                <p className="mb-1 text-xs font-medium text-neutral-600">Vorschau (Nutzeransicht)</p>
                <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">
                  <p className="mb-1 font-medium text-neutral-900">
                    {target === "MAINTENANCE" ? "Wartungsarbeiten" : "Hinweis"}
                  </p>
                  <p>{message}</p>
                </div>
              </div>
            )}
            {target === "MAINTENANCE" && (
              <div>
                <label htmlFor="app-status-until" className="mb-1 flex items-center gap-1 text-xs font-medium text-neutral-600">
                  Geplantes Ende (optional)
                  <InfoTooltip text="Rein informativ - schaltet nicht automatisch zurück auf Aktiv, muss danach manuell zurückgesetzt werden." />
                </label>
                <input
                  id="app-status-until"
                  type="datetime-local"
                  value={maintenanceUntil}
                  onChange={(e) => setMaintenanceUntil(e.target.value)}
                  className={`${inputClass} w-64`}
                />
              </div>
            )}

            {error && (
              <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setTarget(null)}>
                Abbrechen
              </Button>
              <Button type="submit" variant={target === "DISABLED" ? "danger" : "primary"} disabled={busy || !reason.trim()}>
                {busy ? "…" : "Bestätigen"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
