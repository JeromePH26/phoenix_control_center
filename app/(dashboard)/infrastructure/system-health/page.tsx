import { cookies } from "next/headers";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import KeyValueList from "@/components/ui/KeyValueList";
import StateMessage from "@/components/ui/StateMessage";
import { backendFetch, safeJson } from "@/lib/backend";
import { SESSION_COOKIE_NAME } from "@/lib/session";
import type { SystemHealth } from "@/lib/types";

function StatTile({ label, value, tone }: { label: string; value: number | string | null | undefined; tone?: "red" | "gold" }) {
  return (
    <div className="rounded-md border border-neutral-100 bg-neutral-50 px-3 py-2.5">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className={`mt-0.5 text-xl font-semibold ${tone === "red" ? "text-red-600" : tone === "gold" ? "text-phoenix-gold-dark" : "text-neutral-900"}`}>
        {value === null || value === undefined ? "–" : value}
      </p>
    </div>
  );
}

export default async function SystemHealthPage() {
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

  const dbSizeMb = health ? Math.round(health.database.sizeBytes / (1024 * 1024)) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">System Health</h1>
        <p className="text-sm text-neutral-400">Aggregierte Kennzahlen aus API-Nutzung, Jobs, App-Status und Datenbank.</p>
      </div>

      {errorState === "unreachable" && (
        <StateMessage title="PHÖNIX Backend nicht erreichbar" description="Die Verbindung zum Backend konnte nicht hergestellt werden." />
      )}
      {errorState === "forbidden" && (
        <StateMessage title="Keine Berechtigung" description="Für dieses Konto liegt keine Berechtigung vor." />
      )}
      {errorState === "error" && (
        <StateMessage title="System Health konnte nicht geladen werden" description="Ein unerwarteter Fehler ist aufgetreten." />
      )}

      {!errorState && health && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatTile label="App-Status" value={health.appStatus.status as string} tone={health.appStatus.status === "ACTIVE" ? undefined : "red"} />
            <StatTile label="Offene Tickets" value={health.openTicketCount} tone={health.openTicketCount > 0 ? "gold" : undefined} />
            <StatTile label="Offene Incidents" value={health.openIncidentCount} tone={health.openIncidentCount > 0 ? "red" : undefined} />
            <StatTile label="DB-Größe" value={`${dbSizeMb} MB`} />
          </div>

          <Card title="API Usage">
            <KeyValueList
              data={Object.fromEntries(
                health.apiUsage.map((row) => [`${row.api_name}`, `${row.requests} Requests heute`])
              )}
            />
          </Card>

          <Card title="Pending Jobs">
            <KeyValueList
              data={{
                "Football Daily Pipeline": health.pendingJobs.footballDailyPipeline,
                "Football Match Settlement": health.pendingJobs.footballMatchSettlement,
              }}
            />
          </Card>

          <Card title="Größte Tabellen" action={<Badge tone="neutral">Top 15</Badge>}>
            <KeyValueList
              data={Object.fromEntries(health.database.largestTables.map((t) => [t.table, `${t.rows} Zeilen`]))}
            />
          </Card>
        </>
      )}
    </div>
  );
}
