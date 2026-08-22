import { cookies } from "next/headers";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import DataTable, { Column } from "@/components/ui/DataTable";
import InfoTooltip from "@/components/ui/InfoTooltip";
import StateMessage from "@/components/ui/StateMessage";
import { backendFetch, safeJson } from "@/lib/backend";
import { SESSION_COOKIE_NAME } from "@/lib/session";
import type { DatabaseIndexRow, DatabaseSizeSnapshot, SystemHealth } from "@/lib/types";

function formatMb(bytes: number | null | undefined): string {
  if (bytes == null) return "–";
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "–";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" })} · ${date.toLocaleTimeString("de-DE", {
    timeZone: "Europe/Berlin",
    hour: "2-digit",
    minute: "2-digit",
  })} Uhr`;
}

export default async function DatabasePage() {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value ?? null;

  let health: SystemHealth | null = null;
  let errorState: "unreachable" | "forbidden" | "error" | null = null;

  try {
    const res = await backendFetch("/system-health", { token });
    if (res.status === 403) {
      errorState = "forbidden";
    } else if (!res.ok) {
      errorState = "error";
    } else {
      health = await safeJson<SystemHealth>(res);
    }
  } catch {
    errorState = "unreachable";
  }

  const tableColumns: Column<{ table: string; rows: number }>[] = [
    {
      header: "Tabelle",
      info: "Interner, technischer Name des Datenspeicherbereichs (keine Übersetzung — nur für Entwickler relevant).",
      cell: (t) => <code className="text-xs">{t.table}</code>,
    },
    { header: "Zeilen (geschätzt)", info: "Ungefähre Anzahl gespeicherter Datensätze in dieser Tabelle.", cell: (t) => t.rows },
  ];

  const indexColumns: Column<DatabaseIndexRow>[] = [
    { header: "Tabelle", cell: (i) => <code className="text-xs">{i.table}</code> },
    { header: "Index", cell: (i) => <code className="text-xs">{i.index}</code> },
    { header: "Größe", cell: (i) => formatMb(i.sizeBytes) },
    {
      header: "Nutzung",
      info: "Wie oft dieser Index seit dem letzten Datenbank-Neustart tatsächlich verwendet wurde. 0 = wird evtl. gar nicht gebraucht.",
      cell: (i) => `${i.scans} Scans`,
    },
  ];

  const historyColumns: Column<DatabaseSizeSnapshot>[] = [
    { header: "Zeitpunkt", cell: (s) => formatDateTime(s.recorded_at) },
    { header: "Größe", cell: (s) => formatMb(s.size_bytes) },
  ];

  const sizeMb = health ? health.database.sizeBytes / (1024 * 1024) : null;
  const limitMb = health?.database.sizeLimitMb ?? null;
  const percent = sizeMb != null && limitMb ? (sizeMb / limitMb) * 100 : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-1.5 text-xl font-semibold text-neutral-900">
          Database
          <InfoTooltip text="Direkter Blick in die Datenbank (den zentralen Datenspeicher im Hintergrund) von PHÖNIX — rein informativ." />
        </h1>
        <p className="text-sm text-neutral-400">Direkte Postgres-Introspektion — keine externe Anbindung nötig.</p>
      </div>

      {errorState === "unreachable" && (
        <StateMessage title="PHÖNIX Backend nicht erreichbar" description="Die Verbindung zum Backend konnte nicht hergestellt werden." />
      )}
      {errorState === "forbidden" && (
        <StateMessage title="Keine Berechtigung" description="Für dieses Konto liegt keine Berechtigung vor." />
      )}
      {errorState === "error" && (
        <StateMessage title="Datenbank-Kennzahlen konnten nicht geladen werden" description="Ein unerwarteter Fehler ist aufgetreten." />
      )}

      {!errorState && health && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="rounded-md border border-neutral-100 bg-white px-4 py-3 shadow-sm">
              <p className="text-xs text-neutral-500">Gesamtgröße</p>
              <p className="mt-0.5 text-xl font-semibold text-neutral-900">{formatMb(health.database.sizeBytes)}</p>
            </div>
            <div className="rounded-md border border-neutral-100 bg-white px-4 py-3 shadow-sm">
              <p className="flex items-center gap-1 text-xs text-neutral-500">
                Warnschwelle
                <InfoTooltip text="Konfiguriertes Limit (Umgebungsvariable DATABASE_SIZE_LIMIT_MB), z.B. das Speicherlimit des Railway-Plans. Ohne Konfiguration keine Prozentanzeige." />
              </p>
              <p className="mt-0.5 text-xl font-semibold text-neutral-900">
                {percent != null ? (
                  <Badge tone={percent >= 95 ? "red" : percent >= 85 ? "gold" : percent >= 70 ? "gold" : "green"}>{percent.toFixed(0)}%</Badge>
                ) : (
                  <span className="text-sm font-normal text-neutral-400">Nicht konfiguriert</span>
                )}
              </p>
            </div>
          </div>

          <Card title="Größte Tabellen (Top 15 nach Zeilenzahl)">
            <DataTable columns={tableColumns} rows={health.database.largestTables} rowKey={(t) => t.table} emptyMessage="Keine Daten" />
          </Card>

          <Card
            title={
              <span className="inline-flex items-center gap-1">
                Indizes (Top 20 nach Größe)
                <InfoTooltip text="Indizes beschleunigen Datenbankabfragen, kosten aber selbst Speicherplatz. Ein großer Index mit 0 Scans wird evtl. gar nicht gebraucht." />
              </span>
            }
          >
            <DataTable columns={indexColumns} rows={health.database.indexes ?? []} rowKey={(i) => `${i.table}-${i.index}`} emptyMessage="Keine Daten" />
          </Card>

          <Card
            title="Langsame Queries"
            action={
              health.database.slowQueriesAvailable ? undefined : <span className="text-xs text-neutral-400">Nicht verfügbar</span>
            }
          >
            {health.database.slowQueriesAvailable ? (
              <DataTable
                columns={[
                  { header: "Query", cell: (q) => <code className="text-xs">{q.query.slice(0, 120)}</code> },
                  { header: "Aufrufe", cell: (q) => q.calls },
                  { header: "Ø Dauer", cell: (q) => `${q.meanExecMs.toFixed(1)} ms` },
                  { header: "Max. Dauer", cell: (q) => `${q.maxExecMs.toFixed(1)} ms` },
                ]}
                rows={health.database.slowQueries ?? []}
                rowKey={(q) => q.query}
                emptyMessage="Keine Daten"
              />
            ) : (
              <p className="text-sm text-neutral-400">
                Die Postgres-Erweiterung <code className="rounded bg-neutral-100 px-1">pg_stat_statements</code> ist auf
                dieser Datenbank nicht aktiviert — ohne sie lässt sich nicht ermitteln, welche Abfragen langsam sind.
              </p>
            )}
          </Card>

          <Card
            title="Größenverlauf"
            action={<span className="text-xs text-neutral-400">Aufruf-getrieben</span>}
          >
            <p className="mb-3 text-xs text-neutral-400">
              Kein eigener Erfassungs-Job — es wird bei jedem Aufruf dieser Seite (oder von System Health) ein echter
              Snapshot gespeichert. Die Abstände zwischen den Einträgen entsprechen also, wann diese Seite tatsächlich
              geöffnet wurde, nicht einem festen Takt.
            </p>
            <DataTable columns={historyColumns} rows={health.database.sizeHistory ?? []} rowKey={(s) => s.recorded_at} emptyMessage="Noch keine Snapshots" />
          </Card>
        </>
      )}
    </div>
  );
}
