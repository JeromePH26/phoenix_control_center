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
import type { PushBroadcast } from "@/lib/types";

type LoadState = "loading" | "loaded" | "unreachable" | "error";

// Section 19 (AN2): "Zeichenzähler" - weiche Richtwerte, ab denen die
// Nachricht auf typischen Sperrbildschirmen abgeschnitten wird. Keine
// harte Backend-Grenze, daher nur eine Warnfarbe, keine Blockade.
const TITLE_SOFT_LIMIT = 65;
const BODY_SOFT_LIMIT = 150;

const inputClass =
  "w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-900 focus:border-phoenix-gold focus:outline-none focus:ring-1 focus:ring-phoenix-gold";
const labelClass = "mb-1 block text-xs font-medium text-neutral-600";

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

function CharCounter({ value, limit }: { value: string; limit: number }) {
  const over = value.length > limit;
  return (
    <span className={`text-xs ${over ? "text-amber-600" : "text-neutral-400"}`}>
      {value.length} / {limit} Zeichen{over ? " – wird auf manchen Geräten abgeschnitten" : ""}
    </span>
  );
}

export default function PushCenterClient() {
  const [broadcasts, setBroadcasts] = useState<PushBroadcast[]>([]);
  const [state, setState] = useState<LoadState>("loading");

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [deepLink, setDeepLink] = useState("");
  const [targetType, setTargetType] = useState<"all" | "league">("all");
  const [targetValue, setTargetValue] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");

  const [targetCount, setTargetCount] = useState<number | null>(null);
  const [targetCountLoading, setTargetCountLoading] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const [testInstallationId, setTestInstallationId] = useState("");
  const [testBusy, setTestBusy] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

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

  // Section 19 (AN2): "Zielgruppen-Vorschau" - Anzahl der Geräte, bevor
  // überhaupt gesendet wird. Debounced, damit Tippen in der Liga-ID nicht
  // bei jedem Tastendruck eine Anfrage auslöst.
  useEffect(() => {
    if (targetType === "league" && !targetValue.trim()) {
      setTargetCount(null);
      return;
    }
    setTargetCountLoading(true);
    const timeout = setTimeout(async () => {
      try {
        const qs = new URLSearchParams({ targetType });
        if (targetType === "league") qs.set("targetValue", targetValue.trim());
        const res = await fetch(`/api/push/target-count?${qs.toString()}`);
        const data = await res.json().catch(() => null);
        setTargetCount(res.ok && typeof data?.count === "number" ? data.count : null);
      } catch {
        setTargetCount(null);
      } finally {
        setTargetCountLoading(false);
      }
    }, 400);
    return () => clearTimeout(timeout);
  }, [targetType, targetValue]);

  const isScheduleInFuture = scheduledAt !== "" && new Date(scheduledAt).getTime() > Date.now();

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
          deepLink: deepLink.trim() || undefined,
          scheduledAt: isScheduleInFuture ? new Date(scheduledAt).toISOString() : undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? `Fehler (Status ${res.status}).`);
        return;
      }
      if (data.scheduled) {
        setResult(`Geplant für ${formatDateTime(data.scheduledAt)}.`);
      } else {
        setResult(`Gesendet an ${data.sent} von ${data.targetCount} Geräten (${data.failed} fehlgeschlagen).`);
      }
      setConfirmOpen(false);
      setTitle("");
      setBody("");
      setDeepLink("");
      setTargetValue("");
      setScheduledAt("");
      load();
    } catch {
      setError("Verbindung zum Backend fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  async function handleTestSend() {
    setTestBusy(true);
    setTestError(null);
    setTestResult(null);
    try {
      const res = await fetch("/api/push/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ installationId: testInstallationId.trim(), title, body }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setTestError(data?.error ?? `Fehler (Status ${res.status}).`);
        return;
      }
      setTestResult(data.sent ? "Test-Push zugestellt." : "Zustellung fehlgeschlagen (Gerät evtl. offline/App deinstalliert).");
    } catch {
      setTestError("Verbindung zum Backend fehlgeschlagen.");
    } finally {
      setTestBusy(false);
    }
  }

  const columns: Column<PushBroadcast>[] = [
    { header: "Titel", cell: (b) => b.title },
    { header: "Ziel", info: "Wer die Push-Nachricht auf sein Gerät bekommen hat/bekommen soll.", cell: (b) => (b.target_type === "league" ? `Liga: ${b.target_value}` : "Alle") },
    {
      header: "Status",
      cell: (b) =>
        b.scheduled_at && !b.sent_at ? (
          <Badge tone="gold">Geplant: {formatDateTime(b.scheduled_at)}</Badge>
        ) : (
          <Badge tone="green">Gesendet</Badge>
        ),
    },
    { header: "Gesendet", info: "Anzahl der Geräte, die die Nachricht erfolgreich erhalten haben.", cell: (b) => (b.sent_at ? <Badge tone="green">{b.sent_count}</Badge> : "–") },
    { header: "Fehlgeschlagen", info: "Anzahl der Geräte, bei denen die Zustellung nicht funktioniert hat (z.B. App deinstalliert).", cell: (b) => (b.failed_count > 0 ? <Badge tone="red">{b.failed_count}</Badge> : "–") },
    {
      header: "Deep Link",
      info: "Ziel-Bildschirm in der App, der beim Antippen der Push-Nachricht geöffnet wird.",
      cell: (b) => (b.deep_link_url ? <span className="font-mono text-xs">{b.deep_link_url}</span> : "–"),
    },
    { header: "Zeitpunkt", cell: (b) => formatDateTime(b.sent_at ?? b.created_at) },
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

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Push erstellen" className="lg:col-span-2">
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <label className={labelClass}>Titel</label>
                <CharCounter value={title} limit={TITLE_SOFT_LIMIT} />
              </div>
              <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className={labelClass}>Text</label>
                <CharCounter value={body} limit={BODY_SOFT_LIMIT} />
              </div>
              <textarea rows={3} className={inputClass} value={body} onChange={(e) => setBody(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>
                Deep Link <span className="text-neutral-400">(optional)</span>
              </label>
              <input
                className={inputClass}
                placeholder="z.B. phoenix://match/12345"
                value={deepLink}
                onChange={(e) => setDeepLink(e.target.value)}
              />
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
              <div className="text-sm text-neutral-500">
                {targetCountLoading
                  ? "Zielgruppe wird ermittelt…"
                  : targetCount != null
                    ? `Erreicht: ${targetCount} Geräte`
                    : targetType === "league"
                      ? "Liga-ID eingeben, um die Zielgruppe zu sehen"
                      : ""}
              </div>
            </div>
            <div>
              <label className={labelClass}>
                Zeitplanung <span className="text-neutral-400">(optional – leer lassen für sofortigen Versand)</span>
              </label>
              <input
                type="datetime-local"
                className={`${inputClass} w-64`}
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </div>
          </div>

          {result && <p className="mt-3 text-sm text-neutral-600">{result}</p>}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button
              onClick={() => setConfirmOpen(true)}
              disabled={!title.trim() || !body.trim() || (targetType === "league" && !targetValue.trim())}
            >
              {isScheduleInFuture ? "Planen" : "Senden"}
            </Button>
          </div>

          <div className="mt-4 border-t border-neutral-100 pt-4">
            <p className="mb-2 flex items-center gap-1 text-xs font-medium text-neutral-600">
              Test-Push an Testgerät
              <InfoTooltip text="Sendet Titel und Text (oben) an genau ein Gerät, ohne in der Verlaufs-Historie als Kampagne zu erscheinen. Installation-ID gibt es auf der Geräte-Seite." />
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className={labelClass}>Installation-ID</label>
                <input
                  className={inputClass}
                  placeholder="z.B. 3fa1c2…"
                  value={testInstallationId}
                  onChange={(e) => setTestInstallationId(e.target.value)}
                />
              </div>
              <Button
                variant="secondary"
                disabled={testBusy || !testInstallationId.trim() || !title.trim() || !body.trim()}
                onClick={handleTestSend}
              >
                {testBusy ? "…" : "Test senden"}
              </Button>
            </div>
            {testResult && <p className="mt-2 text-sm text-neutral-600">{testResult}</p>}
            {testError && <p className="mt-2 text-sm text-red-600">{testError}</p>}
          </div>
        </Card>

        <Card title="Vorschau">
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 shadow-sm">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-neutral-400">
              <span className="inline-block h-3 w-3 rounded-full bg-phoenix-gold" />
              PHÖNIX · jetzt
            </div>
            <p className="mt-1 truncate text-sm font-semibold text-neutral-900">{title || "Titel der Push-Nachricht"}</p>
            <p className="mt-0.5 line-clamp-2 text-sm text-neutral-600">{body || "Text der Push-Nachricht erscheint hier."}</p>
          </div>
          <p className="mt-3 text-xs text-neutral-400">
            Näherungsweise Darstellung — das tatsächliche Aussehen unterscheidet sich je nach Gerät/Betriebssystem.
          </p>
        </Card>
      </div>

      <Card title="Verlauf">
        {state === "loading" && <LoadingState />}
        {state === "unreachable" && (
          <StateMessage
            title="PHÖNIX Backend nicht erreichbar"
            description="Die Verbindung zum Backend konnte nicht hergestellt werden."
            onRetry={load}
          />
        )}
        {state === "error" && (
          <StateMessage title="Verlauf konnte nicht geladen werden" description="Ein unerwarteter Fehler ist aufgetreten." onRetry={load} />
        )}
        {state === "loaded" && (
          <DataTable columns={columns} rows={broadcasts} rowKey={(b) => String(b.id)} emptyMessage="Noch keine Push-Nachrichten gesendet" />
        )}
      </Card>

      {confirmOpen && (
        <ConfirmDialog
          title={isScheduleInFuture ? "Push planen" : "Push jetzt senden"}
          description={
            isScheduleInFuture
              ? `"${title}" wird für ${formatDateTime(new Date(scheduledAt).toISOString())} an ${
                  targetType === "league" ? `alle Fans von Liga ${targetValue}` : "alle Geräte"
                } geplant. Dies kann bis zum Versand noch nicht zurückgenommen werden, sobald versendet nicht mehr.`
              : `"${title}" wird an ${targetType === "league" ? `alle Fans von Liga ${targetValue}` : "alle Geräte"}${
                  targetCount != null ? ` (${targetCount} Geräte)` : ""
                } gesendet. Dies kann nicht rückgängig gemacht werden.`
          }
          confirmLabel={isScheduleInFuture ? "Planen" : "Jetzt senden"}
          busy={busy}
          error={error}
          onConfirm={handleSend}
          onClose={() => setConfirmOpen(false)}
        />
      )}
    </div>
  );
}
