import { cookies } from "next/headers";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import DataTable, { Column } from "@/components/ui/DataTable";
import StateMessage from "@/components/ui/StateMessage";
import { backendFetch, safeJson } from "@/lib/backend";
import { SESSION_COOKIE_NAME } from "@/lib/session";
import type { ApiUsagePayload, ApiUsageRow } from "@/lib/types";

function fmt(value: unknown): string {
  if (value === null || value === undefined || value === "") return "–";
  return String(value);
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

  const columns: Column<ApiUsageRow>[] = [
    { header: "API", cell: (r) => <span className="font-medium text-neutral-900">{r.api_name}</span> },
    { header: "Datum", cell: (r) => fmt(r.usage_date) },
    { header: "Requests", cell: (r) => fmt(r.requests) },
    { header: "Zuletzt aktualisiert", cell: (r) => fmt(r.updated_at) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">API Usage</h1>
        <p className="text-sm text-neutral-400">Tägliches Request-Budget je externer API (API-Sports).</p>
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
            <DataTable columns={columns} rows={usage?.today ?? []} rowKey={(r) => `${r.api_name}-${r.usage_date}`} emptyMessage="Keine Daten für heute" />
          </Card>

          <Card title="Letzte 14 Tage">
            <DataTable
              columns={columns}
              rows={usage?.history ?? []}
              rowKey={(r) => `${r.api_name}-${r.usage_date}`}
              emptyMessage="Keine Historie vorhanden"
            />
          </Card>
        </>
      )}
    </div>
  );
}
