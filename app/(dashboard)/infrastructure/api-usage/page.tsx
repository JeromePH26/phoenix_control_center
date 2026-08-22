import { cookies } from "next/headers";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import DataTable, { Column } from "@/components/ui/DataTable";
import InfoTooltip from "@/components/ui/InfoTooltip";
import StateMessage from "@/components/ui/StateMessage";
import { backendFetch, safeJson } from "@/lib/backend";
import { SESSION_COOKIE_NAME } from "@/lib/session";
import type { ApiUsagePayload, ApiUsageRow } from "@/lib/types";

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

// Section 25 (AN2): Reset-Countdown - der Tageszähler läuft immer auf
// UTC-Mitternacht zurück (siehe api_sports_daily_usage.usage_date im
// Backend), deterministisch aus der aktuellen Uhrzeit berechnet, keine
// Schätzung.
function minutesUntilUtcMidnight(): number {
  const now = new Date();
  const nextMidnightUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.max(0, Math.round((nextMidnightUtc - now.getTime()) / 60000));
}
function formatResetCountdown(): string {
  const minutes = minutesUntilUtcMidnight();
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  return `${hours} Std. ${remMinutes} Min.`;
}
function minutesElapsedSinceUtcMidnight(): number {
  const now = new Date();
  const midnightUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.max(1, Math.round((now.getTime() - midnightUtc) / 60000));
}

function percentTone(percent: number | null): "green" | "gold" | "red" | "neutral" {
  if (percent === null) return "neutral";
  if (percent >= 95) return "red";
  if (percent >= 85) return "gold";
  if (percent >= 70) return "gold";
  return "green";
}

function usagePercent(row: ApiUsageRow): number | null {
  if (row.daily_limit == null || row.daily_limit <= 0) return null;
  return (row.requests / row.daily_limit) * 100;
}

function errorRatePercent(row: ApiUsageRow): number | null {
  const errors = row.errors ?? 0;
  const total = row.requests + errors;
  if (total === 0) return null;
  return (errors / total) * 100;
}

export default async function ApiUsagePage() {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value ?? null;

  let usage: ApiUsagePayload | null = null;
  let errorState: "unreachable" | "forbidden" | "error" | null = null;

  try {
    const res = await backendFetch("/api-usage", { token });
    if (res.status === 403) {
      errorState = "forbidden";
    } else if (!res.ok) {
      errorState = "error";
    } else {
      usage = await safeJson<ApiUsagePayload>(res);
    }
  } catch {
    errorState = "unreachable";
  }

  const today = usage?.today ?? [];
  const elapsedMinutes = minutesElapsedSinceUtcMidnight();

  const todayColumns: Column<ApiUsageRow>[] = [
    { header: "API", cell: (r) => <span className="font-medium text-neutral-900">{r.api_name}</span> },
    { header: "Verbraucht", info: "Anzahl der heute (seit 00:00 UTC) an diese externe Datenquelle geschickten Anfragen.", cell: (r) => fmt(r.requests) },
    {
      header: "Limit",
      info: "Konfiguriertes Tageslimit (Umgebungsvariable API_<NAME>_DAILY_LIMIT). Ohne Konfiguration kann kein Prozentsatz berechnet werden.",
      cell: (r) => (r.daily_limit != null ? fmt(r.daily_limit) : <span className="text-neutral-400">Nicht konfiguriert</span>),
    },
    {
      header: "Auslastung",
      cell: (r) => {
        const percent = usagePercent(r);
        if (percent === null) return <span className="text-neutral-300">–</span>;
        return <Badge tone={percentTone(percent)}>{percent.toFixed(0)}%</Badge>;
      },
    },
    {
      header: "Verbleibend",
      cell: (r) => (r.daily_limit != null ? fmt(Math.max(0, r.daily_limit - r.requests)) : "–"),
    },
    {
      header: "Ø Anfragen/Min",
      info: "Durchschnitt aus den heutigen Anfragen geteilt durch die seit 00:00 UTC vergangenen Minuten - kein Live-Wert, sondern ein Tagesdurchschnitt.",
      cell: (r) => (r.requests / elapsedMinutes).toFixed(2),
    },
    {
      header: "Fehler",
      info: "Anzahl der heute fehlgeschlagenen Anfragen an diese Datenquelle (HTTP-Fehler, Timeouts, ungültige Antworten).",
      cell: (r) => (r.errors ? <Badge tone="red">{r.errors}</Badge> : <span className="text-neutral-300">0</span>),
    },
    {
      header: "Fehlerquote",
      cell: (r) => {
        const rate = errorRatePercent(r);
        return rate === null ? "–" : `${rate.toFixed(1)}%`;
      },
    },
    { header: "Zuletzt aktualisiert", cell: (r) => formatDateTime(r.updated_at) },
  ];

  // Section 25 (AN2): "alte deaktivierte Sportarten nicht dominant
  // anzeigen" - Historie nach Gesamtanfragen über den Zeitraum sortiert,
  // damit tatsächlich aktive Datenquellen oben stehen statt alphabetisch/
  // nach Datum vermischt mit längst inaktiven Restwerten.
  const historyByApi = new Map<string, ApiUsageRow[]>();
  for (const row of usage?.history ?? []) {
    const list = historyByApi.get(row.api_name) ?? [];
    list.push(row);
    historyByApi.set(row.api_name, list);
  }
  const historyGroups = Array.from(historyByApi.entries())
    .map(([apiName, rows]) => ({
      apiName,
      rows: rows.sort((a, b) => b.usage_date.localeCompare(a.usage_date)),
      total: rows.reduce((sum, r) => sum + r.requests, 0),
    }))
    .sort((a, b) => b.total - a.total);

  const historyColumns: Column<ApiUsageRow>[] = [
    { header: "Datum", cell: (r) => fmt(r.usage_date) },
    { header: "Anfragen", cell: (r) => fmt(r.requests) },
    { header: "Fehler", cell: (r) => (r.errors ? <Badge tone="red">{r.errors}</Badge> : "0") },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-1.5 text-xl font-semibold text-neutral-900">
          API Usage
          <InfoTooltip text="Zeigt, wie oft PHÖNIX heute schon bei externen Datenquellen 'angeklopft' hat. Es gibt Tageslimits — bei zu vielen Anfragen könnten Daten fehlen." />
        </h1>
        <p className="text-sm text-neutral-400">
          Tägliches Anfragen-Budget je externer Datenquelle. Reset für alle Zähler: {formatResetCountdown()} (Mitternacht UTC).
        </p>
      </div>

      {errorState === "unreachable" && (
        <StateMessage title="PHÖNIX Backend nicht erreichbar" description="Die Verbindung zum Backend konnte nicht hergestellt werden." />
      )}
      {errorState === "forbidden" && (
        <StateMessage title="Keine Berechtigung" description="Für dieses Konto liegt keine Berechtigung zum Anzeigen der API-Nutzung vor." />
      )}
      {errorState === "error" && (
        <StateMessage title="API-Nutzung konnte nicht geladen werden" description="Beim Laden der Daten ist ein Fehler aufgetreten." />
      )}

      {!errorState && (
        <>
          <Card title="Heute" action={<Badge tone="gold">Live</Badge>}>
            <DataTable columns={todayColumns} rows={today} rowKey={(r) => `${r.api_name}-${r.usage_date}`} emptyMessage="Keine Daten für heute" />
            {today.some((r) => r.daily_limit == null) && (
              <p className="mt-3 text-xs text-neutral-400">
                Für Zeilen ohne konfiguriertes Limit lässt sich keine Auslastung/Warnschwelle berechnen — dafür müsste die
                Umgebungsvariable <code className="rounded bg-neutral-100 px-1">API_&lt;NAME&gt;_DAILY_LIMIT</code> mit dem
                tatsächlichen Tarif-Limit gesetzt werden.
              </p>
            )}
          </Card>

          <Card
            title="Teuerste Endpunkte"
            action={<span className="text-xs text-neutral-400">Nicht verfügbar</span>}
          >
            <p className="text-sm text-neutral-400">
              Es wird nur die Gesamtzahl der Anfragen pro Datenquelle erfasst, nicht pro einzelnem API-Endpunkt (z.B.
              Spielplan vs. Quoten vs. Statistiken getrennt) — eine Aufschlüsselung wäre erfunden, keine echte Messung.
            </p>
          </Card>

          <Card title="Letzte 14 Tage je Datenquelle" action={<span className="text-xs text-neutral-400">Aktivste zuerst</span>}>
            <div className="space-y-6">
              {historyGroups.length === 0 && <p className="text-sm text-neutral-400">Keine Historie vorhanden</p>}
              {historyGroups.map((group) => (
                <div key={group.apiName}>
                  <p className="mb-2 flex items-center gap-2 text-sm font-medium text-neutral-800">
                    {group.apiName}
                    <span className="text-xs font-normal text-neutral-400">{group.total} Anfragen gesamt</span>
                  </p>
                  <DataTable columns={historyColumns} rows={group.rows} rowKey={(r) => `${r.api_name}-${r.usage_date}`} emptyMessage="Keine Historie" />
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
