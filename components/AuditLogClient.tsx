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

const AREA_LABEL: Record<string, string> = {
  employees: "Mitarbeiter",
  audit: "Audit Log",
  search: "Suche",
  overview: "Übersicht",
  apiUsage: "API-Nutzung",
  jobs: "Jobs",
  appControl: "App-Steuerung",
  devices: "Geräte",
  support: "Support-Tickets",
  news: "News",
  faq: "FAQ",
  advertising: "Werbung",
  push: "Push-Nachrichten",
  premium: "Premium-Funktionen",
  football: "Football",
  modelLab: "Model Lab",
  featureFlags: "Feature Flags",
  release: "Release Center",
  incidents: "Incidents",
  security: "Security",
  moduleControl: "Module",
};
function areaLabel(area: string): string {
  if (AREA_LABEL[area]) return AREA_LABEL[area];
  const spaced = area.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[-_]/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

const OBJECT_TYPE_LABEL: Record<string, string> = {
  app_status: "App-Status",
  article: "Artikel",
  asset: "Wappen/Bild",
  broadcast: "Push-Nachricht",
  campaign: "Werbekampagne",
  config: "Einstellung",
  employee: "Mitarbeiter",
  feature: "Premium-Funktion",
  flag: "Feature Flag",
  incident: "Incident",
  match: "Spiel",
  module: "Modul",
  session: "Session",
  ticket: "Support-Ticket",
  user: "Nutzer",
};
function objectTypeLabel(objectType: string): string {
  return OBJECT_TYPE_LABEL[objectType] ?? objectType;
}

const ACTION_LABEL: Record<string, string> = {
  "app_control.status_change": "App-Status geändert",
  "article.create": "Artikel erstellt",
  "article.update": "Artikel geändert",
  "asset.replace": "Wappen/Bild ersetzt",
  "broadcast.send": "Push-Nachricht gesendet",
  "campaign.create": "Werbekampagne erstellt",
  "campaign.update": "Werbekampagne geändert",
  "employee.create": "Mitarbeiter angelegt",
  "employee.disable": "Mitarbeiter deaktiviert",
  "employee.update": "Mitarbeiter geändert",
  "feature.tier_change": "Premium-Funktion geändert",
  "flag.create": "Feature Flag erstellt",
  "flag.update": "Feature Flag geändert",
  "incident.create": "Incident erstellt",
  "incident.update": "Incident geändert",
  "match.flags_update": "Spiel-Einstellungen geändert",
  "module.toggle": "Modul umgeschaltet",
  "premium.manual_grant": "Premium manuell vergeben",
  "premium.manual_revoke": "Premium manuell entzogen",
  "promotion": "Modell befördert",
  "promotion_rejected": "Beförderung abgelehnt",
  "release.update": "Release-Einstellungen geändert",
  "rollback": "Modell zurückgesetzt",
  "session.revoke": "Session widerrufen",
  "ticket.update": "Support-Ticket geändert",
  "user.ban": "Nutzer gesperrt",
  "user.session_revoke": "Nutzer-Session widerrufen",
  "user.unban": "Nutzersperre aufgehoben",
};
function actionLabel(action: string): string {
  if (ACTION_LABEL[action]) return ACTION_LABEL[action];
  const spaced = action.replace(/[._]/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "–";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `${date.toLocaleDateString("de-DE")} · ${date.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  })} Uhr`;
}

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
    { header: "Zeit", cell: (e) => <span className="whitespace-nowrap text-neutral-500">{formatDateTime(e.createdAt)}</span> },
    { header: "Mitarbeiter", cell: (e) => e.employeeLogin },
    { header: "Bereich", info: "In welchem Teil des Systems die Änderung passiert ist.", cell: (e) => <Badge tone="gold">{areaLabel(e.area)}</Badge> },
    {
      header: "Objekt",
      info: "Der genaue Datensatz, der geändert wurde, mit seiner internen Nummer.",
      cell: (e) => `${objectTypeLabel(e.objectType ?? "")} #${e.objectId}`,
    },
    { header: "Aktion", cell: (e) => actionLabel(e.action) },
    { header: "Vorher", info: "Der Zustand der Daten, bevor die Änderung gemacht wurde.", cell: (e) => <JsonViewer value={e.previousValue} label="Vorher" /> },
    { header: "Nachher", info: "Der Zustand der Daten, nachdem die Änderung gemacht wurde.", cell: (e) => <JsonViewer value={e.newValue} label="Nachher" /> },
    { header: "Grund / Kommentar", cell: (e) => e.reason || e.comment || "–" },
    {
      header: "Rückgängig?",
      info: "Zeigt an, ob diese Änderung später wieder zurückgenommen wurde.",
      cell: (e) => (e.reverted ? <Badge tone="red">Zurückgenommen</Badge> : <Badge tone="neutral">Nein</Badge>),
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
