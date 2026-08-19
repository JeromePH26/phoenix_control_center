"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import InfoTooltip from "@/components/ui/InfoTooltip";
import KeyValueList from "@/components/ui/KeyValueList";
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

export default function AppControlStatusClient() {
  const [status, setStatus] = useState<AppControlStatus | null>(null);
  const [state, setState] = useState<LoadState>("loading");

  const [target, setTarget] = useState<AppControlStatusValue | null>(null);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
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
        body: JSON.stringify({ status: target, reason: reason.trim(), message: message.trim() || undefined }),
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
      </div>

      {state === "loading" && <p className="text-sm text-neutral-400">Wird geladen…</p>}
      {state === "unreachable" && (
        <StateMessage title="PHÖNIX Backend nicht erreichbar" description="Die Verbindung zum Backend konnte nicht hergestellt werden." />
      )}
      {state === "forbidden" && (
        <StateMessage title="Keine Berechtigung" description="Für dieses Konto liegt keine Berechtigung für App Control vor." />
      )}
      {state === "error" && (
        <StateMessage title="Status konnte nicht geladen werden" description="Ein unerwarteter Fehler ist aufgetreten." />
      )}

      {state === "loaded" && status && (
        <>
          <Card title="Aktueller Status" action={<Badge tone={toneFor(status.status)}>{labelFor(status.status)}</Badge>}>
            <KeyValueList
              data={{
                Nachricht: status.message ?? null,
                "Zuletzt geändert": status.updated_at ?? null,
                "Geändert von": status.updated_by ?? null,
              }}
              info={{
                Nachricht: "Text, der Nutzern in der App angezeigt wird, z.B. ein Hinweis während der Wartung.",
              }}
            />
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
