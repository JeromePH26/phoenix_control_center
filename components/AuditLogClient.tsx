"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import DataTable, { Column } from "@/components/ui/DataTable";
import InfoTooltip from "@/components/ui/InfoTooltip";
import LoadingState from "@/components/ui/LoadingState";
import Modal from "@/components/ui/Modal";
import Pagination from "@/components/ui/Pagination";
import StateMessage from "@/components/ui/StateMessage";
import type { AuditLogEntry } from "@/lib/types";

type LoadState = "loading" | "loaded" | "forbidden" | "unreachable" | "error";

const PAGE_SIZE = 50;

const AREA_LABEL: Record<string, string> = {
  employees: "Mitarbeiter",
  administration: "Administration",
  audit: "Audit Log",
  search: "Suche",
  overview: "Übersicht",
  apiUsage: "API-Nutzung",
  jobs: "Jobs",
  appControl: "App-Steuerung",
  app_control: "App-Steuerung",
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
  users: "Nutzer",
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
  league: "Liga",
  match: "Spiel",
  model: "Modell",
  module: "Modul",
  session: "Session",
  team: "Team",
  ticket: "Support-Ticket",
  user: "Nutzer",
};
function objectTypeLabel(objectType: string): string {
  return OBJECT_TYPE_LABEL[objectType] ?? objectType;
}

// Section 4: "Link zurück zum betroffenen Objekt, wenn verfügbar" - nur für
// Objekttypen mit einer echten Detailroute, sonst kein Link (kein Rätselraten).
function objectLink(objectType: string, objectId: string | null | undefined): string | null {
  if (!objectId) return null;
  switch (objectType) {
    case "match":
      return `/football/matches/${encodeURIComponent(objectId)}`;
    case "team":
      return `/football/teams/${encodeURIComponent(objectId)}`;
    case "league":
      return `/football/leagues/${encodeURIComponent(objectId)}`;
    case "article":
      return `/content/news/${encodeURIComponent(objectId)}`;
    case "campaign":
      return `/advertising/campaigns/${encodeURIComponent(objectId)}`;
    case "ticket":
      return `/support/tickets/${encodeURIComponent(objectId)}`;
    case "user":
      return `/users/accounts/${encodeURIComponent(objectId)}`;
    case "model":
      return `/model-lab/models/${encodeURIComponent(objectId)}`;
    default:
      return null;
  }
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
  "league.status_change": "Liga-Status geändert",
  "match.flags_update": "Spiel-Einstellungen geändert",
  "match.status_override": "Spielstatus manuell gesetzt",
  "match.status_override_clear": "Manuelle Status-Sperre aufgehoben",
  "module.toggle": "Modul umgeschaltet",
  "premium.manual_grant": "Premium manuell vergeben",
  "premium.manual_revoke": "Premium manuell entzogen",
  promotion: "Modell befördert",
  promotion_rejected: "Beförderung abgelehnt",
  "release.update": "Release-Einstellungen geändert",
  rollback: "Modell zurückgesetzt",
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

const ROLE_LABEL: Record<string, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  TECHNICAL: "Technik",
  SUPPORT: "Support",
  CONTENT: "Content",
  MARKETING: "Marketing",
};

// Section 4: "lokalisierte Zeit in Europe/Berlin" - explizit die Zielzone
// angeben statt der Browser-Zeitzone des Admins zu vertrauen.
function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "–";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "–";
  const datePart = date.toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" });
  const timePart = date.toLocaleTimeString("de-DE", { timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit" });
  return `${datePart} · ${timePart} Uhr`;
}

function formatDiffValue(value: unknown): string {
  if (value === null || value === undefined) return "–";
  return typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

export default function AuditLogClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const area = searchParams.get("area") ?? "";
  const employeeId = searchParams.get("employeeId") ?? "";
  const action = searchParams.get("action") ?? "";
  const dateFrom = searchParams.get("dateFrom") ?? "";
  const dateTo = searchParams.get("dateTo") ?? "";
  const offset = Number(searchParams.get("offset") ?? "0") || 0;

  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [diffEntry, setDiffEntry] = useState<AuditLogEntry | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    const qs = new URLSearchParams();
    if (area) qs.set("area", area);
    if (employeeId) qs.set("employeeId", employeeId);
    if (action) qs.set("action", action);
    if (dateFrom) qs.set("dateFrom", new Date(dateFrom).toISOString());
    if (dateTo) qs.set("dateTo", new Date(dateTo).toISOString());
    qs.set("limit", String(PAGE_SIZE));
    qs.set("offset", String(offset));

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
      setEntries(Array.isArray(data) ? data : (data?.entries ?? []));
      setTotal(typeof data?.total === "number" ? data.total : null);
      setState("loaded");
    } catch {
      setState("unreachable");
    }
  }, [area, employeeId, action, dateFrom, dateTo, offset]);

  useEffect(() => {
    load();
  }, [load]);

  function updateParam(key: string, value: string) {
    const qs = new URLSearchParams(searchParams.toString());
    if (value) qs.set(key, value);
    else qs.delete(key);
    qs.delete("offset");
    router.replace(`/administration/audit-log${qs.toString() ? `?${qs.toString()}` : ""}`);
  }

  function goToOffset(next: number) {
    const qs = new URLSearchParams(searchParams.toString());
    if (next > 0) qs.set("offset", String(next));
    else qs.delete("offset");
    router.replace(`/administration/audit-log${qs.toString() ? `?${qs.toString()}` : ""}`);
  }

  const hasActiveFilters = !!area || !!employeeId || !!action || !!dateFrom || !!dateTo;

  const columns: Column<AuditLogEntry>[] = [
    { header: "Zeit", cell: (e) => <span className="whitespace-nowrap text-neutral-500">{formatDateTime(e.createdAt)}</span> },
    {
      header: "Mitarbeiter",
      info: "Name und Rolle der Person, die die Änderung vorgenommen hat.",
      cell: (e) => (
        <span className="inline-flex items-center gap-1.5">
          <span className="font-medium text-neutral-900">{e.employeeName || e.employeeLogin || "System"}</span>
          {e.employeeRole && <Badge tone="neutral">{ROLE_LABEL[e.employeeRole] ?? e.employeeRole}</Badge>}
        </span>
      ),
    },
    { header: "Bereich", info: "In welchem Teil des Systems die Änderung passiert ist.", cell: (e) => <Badge tone="gold">{areaLabel(e.area)}</Badge> },
    {
      header: "Objekt",
      info: "Der genaue Datensatz, der geändert wurde, mit seiner internen Nummer.",
      cell: (e) => {
        const label = `${objectTypeLabel(e.objectType ?? "")} ${e.objectId ? `#${e.objectId}` : ""}`.trim();
        const href = objectLink(e.objectType, e.objectId);
        if (!href) return label || "–";
        return (
          <a
            href={href}
            onClick={(ev) => ev.stopPropagation()}
            className="text-phoenix-gold-dark hover:underline"
          >
            {label}
          </a>
        );
      },
    },
    { header: "Aktion", cell: (e) => actionLabel(e.action) },
    { header: "Grund / Kommentar", cell: (e) => e.reason || e.comment || "–" },
    {
      header: "Vorher/Nachher",
      cell: (e) =>
        e.previousValue == null && e.newValue == null ? (
          "–"
        ) : (
          <button
            type="button"
            onClick={(ev) => {
              ev.stopPropagation();
              setDiffEntry(e);
            }}
            className="text-xs font-medium text-phoenix-gold-dark hover:underline"
          >
            Diff anzeigen
          </button>
        ),
    },
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
          <select id="area" value={area} onChange={(e) => updateParam("area", e.target.value)} className={inputClass}>
            <option value="">Alle</option>
            {Object.keys(AREA_LABEL).map((a) => (
              <option key={a} value={a}>
                {AREA_LABEL[a]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="action" className="mb-1 block text-xs font-medium text-neutral-600">
            Aktion
          </label>
          <select id="action" value={action} onChange={(e) => updateParam("action", e.target.value)} className={inputClass}>
            <option value="">Alle</option>
            {Object.keys(ACTION_LABEL).map((a) => (
              <option key={a} value={a}>
                {ACTION_LABEL[a]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="employeeId" className="mb-1 block text-xs font-medium text-neutral-600">
            Mitarbeiter-ID
          </label>
          <input
            id="employeeId"
            defaultValue={employeeId}
            placeholder="z.B. 42"
            className={`${inputClass} w-28`}
            onBlur={(e) => updateParam("employeeId", e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") updateParam("employeeId", (e.target as HTMLInputElement).value);
            }}
          />
        </div>
        <div>
          <label htmlFor="dateFrom" className="mb-1 block text-xs font-medium text-neutral-600">
            Von
          </label>
          <input id="dateFrom" type="date" value={dateFrom} onChange={(e) => updateParam("dateFrom", e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="dateTo" className="mb-1 block text-xs font-medium text-neutral-600">
            Bis
          </label>
          <input id="dateTo" type="date" value={dateTo} onChange={(e) => updateParam("dateTo", e.target.value)} className={inputClass} />
        </div>
        {hasActiveFilters && (
          <Button variant="secondary" onClick={() => router.replace("/administration/audit-log")}>
            Filter zurücksetzen
          </Button>
        )}
      </div>

      <Card>
        {state === "loading" && <LoadingState />}
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
            onRetry={load}
          />
        )}
        {state === "error" && (
          <StateMessage title="Audit Log konnte nicht geladen werden" description="Ein unerwarteter Fehler ist aufgetreten." onRetry={load} />
        )}
        {state === "loaded" && (
          <>
            <DataTable columns={columns} rows={entries} rowKey={(e) => e.id} emptyMessage={hasActiveFilters ? "Keine Einträge für diese Filter gefunden" : "Keine Einträge gefunden"} />
            <Pagination offset={offset} limit={PAGE_SIZE} count={entries.length} total={total} onOffsetChange={goToOffset} />
          </>
        )}
      </Card>

      {diffEntry && (
        <Modal title={`${objectTypeLabel(diffEntry.objectType)} ${diffEntry.objectId ? `#${diffEntry.objectId}` : ""} – ${actionLabel(diffEntry.action)}`} onClose={() => setDiffEntry(null)}>
          <div className="max-h-[70vh] space-y-3 overflow-y-auto">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">Vorher</p>
              <pre className="max-w-full overflow-x-auto whitespace-pre-wrap rounded-md bg-neutral-50 p-2 text-[11px] leading-snug text-neutral-700">
                {formatDiffValue(diffEntry.previousValue)}
              </pre>
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">Nachher</p>
              <pre className="max-w-full overflow-x-auto whitespace-pre-wrap rounded-md bg-neutral-50 p-2 text-[11px] leading-snug text-neutral-700">
                {formatDiffValue(diffEntry.newValue)}
              </pre>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
