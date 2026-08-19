import { cookies } from "next/headers";
import Card from "@/components/ui/Card";
import DataTable, { Column } from "@/components/ui/DataTable";
import StateMessage from "@/components/ui/StateMessage";
import { backendFetch, safeJson } from "@/lib/backend";
import { SESSION_COOKIE_NAME } from "@/lib/session";
import type { SystemHealth } from "@/lib/types";

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
    { header: "Tabelle", cell: (t) => <code className="text-xs">{t.table}</code> },
    { header: "Zeilen (geschätzt)", cell: (t) => t.rows },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Database</h1>
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
          <div className="rounded-md border border-neutral-100 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs text-neutral-500">Gesamtgröße</p>
            <p className="mt-0.5 text-xl font-semibold text-neutral-900">
              {Math.round(health.database.sizeBytes / (1024 * 1024))} MB
            </p>
          </div>

          <Card title="Größte Tabellen (Top 15 nach Zeilenzahl)">
            <DataTable columns={tableColumns} rows={health.database.largestTables} rowKey={(t) => t.table} emptyMessage="Keine Daten" />
          </Card>
        </>
      )}
    </div>
  );
}
