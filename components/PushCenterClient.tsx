"use client";

import { useCallback, useEffect, useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import DataTable, { Column } from "@/components/ui/DataTable";
import InfoTooltip from "@/components/ui/InfoTooltip";
import StateMessage from "@/components/ui/StateMessage";
import ConfirmDialog from "@/components/ConfirmDialog";
import type { PushBroadcast } from "@/lib/types";

type LoadState = "loading" | "loaded" | "unreachable" | "error";

const inputClass =
  "w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-900 focus:border-phoenix-gold focus:outline-none focus:ring-1 focus:ring-phoenix-gold";
const labelClass = "mb-1 block text-xs font-medium text-neutral-600";

function fmt(value: unknown): string {
  if (value === null || value === undefined || value === "") return "–";
  return String(value);
}

export default function PushCenterClient() {
  const [broadcasts, setBroadcasts] = useState<PushBroadcast[]>([]);
  const [state, setState] = useState<LoadState>("loading");

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [targetType, setTargetType] = useState<"all" | "league">("all");
  const [targetValue, setTargetValue] = useState("");

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const res = await fetch("/api/push/broadcasts");
      if (res.status === 502) {
        setState("unreachable");
        return;
      }
      if (!res.ok) {
        setState("error");
        return;
      }
      const data = await res.json().catch(() => null);
      setBroadcasts(Array.isArray(data?.broadcasts) ? data.broadcasts : []);
      setState("loaded");
    } catch {
      setState("unreachable");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSend() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/push/broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          body,
          targetType,
          targetValue: targetType === "league" ? targetValue : undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? `Fehler (Status ${res.status}).`);
        return;
      }
      setResult(`Gesendet an ${data.sent} von ${data.targetCount} Geräten (${data.failed} fehlgeschlagen).`);
      setConfirmOpen(false);
      setTitle("");
      setBody("");
      setTargetValue("");
      load();
    } catch {
      setError("Verbindung zum Backend fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  const columns: Column<PushBroadcast>[] = [
    { header: "Titel", cell: (b) => b.title },
    { header: "Ziel", info: "Wer die Push-Nachricht auf sein Gerät bekommen hat.", cell: (b) => (b.target_type === "league" ? `Liga: ${b.target_value}` : "Alle") },
    { header: "Gesendet", info: "Anzahl der Geräte, die die Nachricht erfolgreich erhalten haben.", cell: (b) => <Badge tone="green">{b.sent_count}</Badge> },
    { header: "Fehlgeschlagen", info: "Anzahl der Geräte, bei denen die Zustellung nicht funktioniert hat (z.B. App deinstalliert).", cell: (b) => (b.failed_count > 0 ? <Badge tone="red">{b.failed_count}</Badge> : "–") },
    { header: "Zeitpunkt", cell: (b) => fmt(b.created_at) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-1.5 text-xl font-semibold text-neutral-900">
          Push
          <InfoTooltip text="Push-Benachrichtigung: eine kurze Meldung, die direkt auf dem Handy-Bildschirm der Nutzer erscheint, auch wenn die App gerade nicht offen ist." />
        </h1>
        <p className="text-sm text-neutral-400">
          Ein versendeter Push kann nicht zurückgenommen werden. Premium/Free/Beta-Zielgruppen sind ohne Nutzerkonten
          nicht möglich — verfügbar: alle Geräte oder Fans einer Liga.
        </p>
      </div>

      <Card title="Push erstellen">
        <div className="space-y-3">
          <div>
            <label className={labelClass}>Titel</label>
            <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Text</label>
            <textarea rows={3} className={inputClass} value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className={labelClass}>Zielgruppe</label>
              <select
                className={inputClass}
                value={targetType}
                onChange={(e) => setTargetType(e.target.value as "all" | "league")}
              >
                <option value="all">Alle Geräte</option>
                <option value="league">Liga-Fans</option>
              </select>
            </div>
            {targetType === "league" && (
              <div>
                <label className={labelClass}>Liga-ID</label>
                <input className={inputClass} value={targetValue} onChange={(e) => setTargetValue(e.target.value)} />
              </div>
            )}
          </div>
        </div>

        {result && <p className="mt-3 text-sm text-neutral-600">{result}</p>}

        <div className="mt-4">
          <Button
            onClick={() => setConfirmOpen(true)}
            disabled={!title.trim() || !body.trim() || (targetType === "league" && !targetValue.trim())}
          >
            Senden
          </Button>
        </div>
      </Card>

      <Card title="Verlauf">
        {state === "loading" && <p className="py-8 text-center text-sm text-neutral-400">Wird geladen…</p>}
        {state === "unreachable" && (
          <StateMessage title="PHÖNIX Backend nicht erreichbar" description="Die Verbindung zum Backend konnte nicht hergestellt werden." />
        )}
        {state === "error" && (
          <StateMessage title="Verlauf konnte nicht geladen werden" description="Ein unerwarteter Fehler ist aufgetreten." />
        )}
        {state === "loaded" && (
          <DataTable columns={columns} rows={broadcasts} rowKey={(b) => String(b.id)} emptyMessage="Noch keine Push-Nachrichten gesendet" />
        )}
      </Card>

      {confirmOpen && (
        <ConfirmDialog
          title="Push jetzt senden"
          description={`"${title}" wird an ${targetType === "league" ? `alle Fans von Liga ${targetValue}` : "alle Geräte"} gesendet. Dies kann nicht rückgängig gemacht werden.`}
          confirmLabel="Jetzt senden"
          busy={busy}
          error={error}
          onConfirm={handleSend}
          onClose={() => setConfirmOpen(false)}
        />
      )}
    </div>
  );
}
