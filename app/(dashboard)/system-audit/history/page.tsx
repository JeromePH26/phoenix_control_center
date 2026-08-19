import { cookies } from "next/headers";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import DataTable, { Column } from "@/components/ui/DataTable";
import JsonViewer from "@/components/ui/JsonViewer";
import StateMessage from "@/components/ui/StateMessage";
import { backendFetch, safeJson } from "@/lib/backend";
import { SESSION_COOKIE_NAME } from "@/lib/session";
import type { SystemAuditRun } from "@/lib/types";

function fmt(value: unknown): string {
  if (value === null || value === undefined || value === "") return "–";
  return String(value);
}

export default async function SystemAuditHistoryPage() {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value ?? null;

  let runs: SystemAuditRun[] = [];
  let errorState: "unreachable" | "forbidden" | "error" | null = null;

  try {
    const res = await backendFetch("/system-audit/history", { token });
    if (res.status === 403) {
      errorState = "forbidden";
    } else if (!res.ok) {
      errorState = "error";
    } else {
      const data = await safeJson<{ runs?: SystemAuditRun[] }>(res);
      runs = data?.runs ?? [];
    }
  } catch {
    errorState = "unreachable";
  }

  const columns: Column<SystemAuditRun>[] = [
    { header: "Zeitpunkt", cell: (r) => fmt(r.generated_at) },
    { header: "Critical", cell: (r) => <Badge tone={r.critical_count > 0 ? "red" : "green"}>{r.critical_count}</Badge> },
    { header: "Warnings", cell: (r) => <Badge tone={r.warning_count > 0 ? "gold" : "green"}>{r.warning_count}</Badge> },
    { header: "Bericht", cell: (r) => <JsonViewer value={r.report_text} label="Bericht" /> },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">System Audit — Historie</h1>
        <p className="text-sm text-neutral-400">Jeder unter &quot;Monatsbericht&quot; ausgeführte Audit wird hier gespeichert.</p>
      </div>

      {errorState === "unreachable" && (
        <StateMessage title="PHÖNIX Backend nicht erreichbar" description="Die Verbindung zum Backend konnte nicht hergestellt werden." />
      )}
      {errorState === "forbidden" && (
        <StateMessage title="Keine Berechtigung" description="Für dieses Konto liegt keine Berechtigung vor." />
      )}
      {errorState === "error" && (
        <StateMessage title="Historie konnte nicht geladen werden" description="Ein unerwarteter Fehler ist aufgetreten." />
      )}

      {!errorState && (
        <Card>
          <DataTable columns={columns} rows={runs} rowKey={(r) => String(r.id)} emptyMessage="Noch keine Audit-Läufe" />
        </Card>
      )}
    </div>
  );
}
