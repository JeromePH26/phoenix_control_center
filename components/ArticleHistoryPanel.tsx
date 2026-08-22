"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import InfoTooltip from "@/components/ui/InfoTooltip";
import JsonViewer from "@/components/ui/JsonViewer";
import { useEmployeeNames } from "@/lib/useEmployeeNames";
import type { AuditLogEntry } from "@/lib/types";

const ACTION_LABEL: Record<string, string> = {
  "article.create": "Erstellt",
  "article.update": "Geändert",
};
function actionLabel(action: string): string {
  if (ACTION_LABEL[action]) return ACTION_LABEL[action];
  const spaced = action.replace(/[._]/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "–";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "–";
  const datePart = date.toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" });
  const timePart = date.toLocaleTimeString("de-DE", { timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit" });
  return `${datePart} · ${timePart} Uhr`;
}

/**
 * Section 20 (AN2): "Änderungshistorie" für News- und FAQ-Artikel - dieselbe
 * admin_audit_log-Tabelle, die auch die Haupt-Audit-Log-Seite anzeigt
 * (Section 4), hier gefiltert auf ein einzelnes Objekt.
 */
export default function ArticleHistoryPanel({ area, objectId }: { area: "news" | "faq"; objectId: number | string }) {
  const [entries, setEntries] = useState<AuditLogEntry[] | null>(null);
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading");
  const { employeeName } = useEmployeeNames();

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    fetch(`/api/audit-log?area=${area}&objectId=${encodeURIComponent(String(objectId))}&limit=50`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((data) => {
        if (cancelled) return;
        setEntries(Array.isArray(data?.entries) ? data.entries : []);
        setState("loaded");
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [area, objectId]);

  return (
    <Card
      title={
        <span className="inline-flex items-center gap-1">
          Änderungshistorie
          <InfoTooltip text="Wer diesen Eintrag wann erstellt oder geändert hat, mit dem, was sich dabei geändert hat." />
        </span>
      }
    >
      {state === "loading" && <p className="text-sm text-neutral-400">Wird geladen…</p>}
      {state === "error" && <p className="text-sm text-neutral-400">Historie konnte nicht geladen werden.</p>}
      {state === "loaded" && entries && entries.length === 0 && <p className="text-sm text-neutral-400">Keine Historie vorhanden.</p>}
      {state === "loaded" && entries && entries.length > 0 && (
        <ul className="space-y-2">
          {entries.map((e) => (
            <li key={e.id} className="flex items-start justify-between gap-4 border-b border-neutral-100 pb-2 text-sm last:border-0 last:pb-0">
              <div>
                <span className="font-medium text-neutral-900">{actionLabel(e.action)}</span>
                <span className="text-neutral-500"> — {e.employeeName || employeeName(e.employeeId) || "System"}</span>
                {(e.previousValue != null || e.newValue != null) && (
                  <div className="mt-1 flex gap-3">
                    <JsonViewer value={e.previousValue} label="Vorher" />
                    <JsonViewer value={e.newValue} label="Nachher" />
                  </div>
                )}
              </div>
              <span className="whitespace-nowrap text-xs text-neutral-400">{formatDateTime(e.createdAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
