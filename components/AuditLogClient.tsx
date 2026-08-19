"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import DataTable, { Column } from "@/components/ui/DataTable";
import InfoTooltip from "@/components/ui/InfoTooltip";
import JsonViewer from "@/components/ui/JsonViewer";
import StateMessage from "@/components/ui/StateMessage";
import type { AuditLogEntry } from "@/lib/types";

type LoadState = "loading" | "loaded" | "forbidden" | "unreachable" | "error";

export default function AuditLogClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const area = searchParams.get("area") ?? "";
  const employeeId = searchParams.get("employeeId") ?? "";

  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [state, setState] = useState<LoadState>("loading");

  const load = useCallback(async () => {
    setState("loading");
    const qs = new URLSearchParams();
    if (area) qs.set("area", area);
    if (employeeId) qs.set("employeeId", employeeId);
    qs.set("limit", "100");

    try {
      const res = await fetch(`/api/audit-log?${qs.toString()}`);
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
      const data = await res.json();
      setEntries(Array.isArray(data) ? data : data?.entries ?? []);
      setState("loaded");
    } catch {
      setState("unreachable");
    }
  }, [area, employeeId]);

  useEffect(() => {
    load();
  }, [load]);

  function updateParam(key: string, value: string) {
    const qs = new URLSearchParams(searchParams.toString());
    if (value) qs.set(key, value);
    else qs.delete(key);
    router.replace(`/administration/audit-log${qs.toString() ? `?${qs.toString()}` : ""}`);
  }

  const columns: Column<AuditLogEntry>[] = [
    { header: "Zeit", cell: (e) => <span className="whitespace-nowrap text-neutral-500">{e.createdAt}</span> },
    { header: "Mitarbeiter", cell: (e) => e.employeeLogin },
    { header: "Bereich", info: "In welchem Teil des Systems die Änderung passiert ist (z.B. Mitarbeiter, Werbung).", cell: (e) => <Badge tone="gold">{e.area}</Badge> },
    { header: "Objekt", info: "Der genaue Datensatz, der geändert wurde, mit seiner internen Nummer.", cell: (e) => `${e.objectType} #${e.objectId}` },
    { header: "Aktion", cell: (e) => e.action },
    { header: "Vorher", info: "Der Zustand der Daten, bevor die Änderung gemacht wurde.", cell: (e) => <JsonViewer value={e.previousValue} label="Vorher" /> },
    { header: "Nachher", info: "Der Zustand der Daten, nachdem die Änderung gemacht wurde.", cell: (e) => <JsonViewer value={e.newValue} label="Nachher" /> },
    { header: "Grund / Kommentar", cell: (e) => e.reason || e.comment || "–" },
    {
      header: "Rückgängig?",
      info: "Zeigt an, ob diese Änderung später wieder zurückgenommen wurde.",
      cell: (e) => (e.reverted ? <Badge tone="red">Reverted</Badge> : <Badge tone="neutral">Nein</Badge>),
    },
  ];

  const inputClass =
    "rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-900 focus:border-phoenix-gold focus:outline-none focus:ring-1 focus:ring-phoenix-gold";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-1.5 text-xl font-semibold text-neutral-900">
          Audit Log
          <InfoTooltip text="Ein lückenloses Protokoll: wer hat wann was in PHÖNIX geändert. Zum Nachvollziehen von Änderungen." />
        </h1>
        <p className="text-sm text-neutral-400">Nachvollziehbare Änderungshistorie über alle Bereiche.</p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="area" className="mb-1 block text-xs font-medium text-neutral-600">
            Bereich
          </label>
          <input
            id="area"
            defaultValue={area}
            placeholder="z.B. employees"
            className={inputClass}
            onBlur={(e) => updateParam("area", e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") updateParam("area", (e.target as HTMLInputElement).value);
            }}
          />
        </div>
        <div>
          <label htmlFor="employeeId" className="mb-1 block text-xs font-medium text-neutral-600">
            Mitarbeiter-ID
          </label>
          <input
            id="employeeId"
            defaultValue={employeeId}
            placeholder="z.B. 42"
            className={inputClass}
            onBlur={(e) => updateParam("employeeId", e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") updateParam("employeeId", (e.target as HTMLInputElement).value);
            }}
          />
        </div>
      </div>

      <Card>
        {state === "loading" && <p className="py-8 text-center text-sm text-neutral-400">Wird geladen…</p>}
        {state === "forbidden" && (
          <StateMessage
            title="Keine Berechtigung"
            description="Für dieses Konto liegt keine Berechtigung zum Anzeigen des Audit Logs vor."
          />
        )}
        {state === "unreachable" && (
          <StateMessage
            title="PHÖNIX Backend nicht erreichbar"
            description="Die Verbindung zum Backend konnte nicht hergestellt werden."
          />
        )}
        {state === "error" && (
          <StateMessage title="Audit Log konnte nicht geladen werden" description="Ein unerwarteter Fehler ist aufgetreten." />
        )}
        {state === "loaded" && (
          <DataTable columns={columns} rows={entries} rowKey={(e) => e.id} emptyMessage="Keine Einträge gefunden" />
        )}
      </Card>
    </div>
  );
}
