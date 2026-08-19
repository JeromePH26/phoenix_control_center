import { cookies } from "next/headers";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import DataTable, { Column } from "@/components/ui/DataTable";
import StateMessage from "@/components/ui/StateMessage";
import { backendFetch, safeJson } from "@/lib/backend";
import { SESSION_COOKIE_NAME } from "@/lib/session";
import type { AdminSession } from "@/lib/types";

function fmt(value: unknown): string {
  if (value === null || value === undefined || value === "") return "–";
  return String(value);
}

export default async function OnlineStatusPage() {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value ?? null;

  let sessions: AdminSession[] = [];
  let errorState: "unreachable" | "forbidden" | "error" | null = null;

  try {
    const res = await backendFetch("/security/sessions", { token });
    if (res.status === 403) {
      errorState = "forbidden";
    } else if (!res.ok) {
      errorState = "error";
    } else {
      const data = await safeJson<{ sessions?: AdminSession[] }>(res);
      sessions = data?.sessions ?? [];
    }
  } catch {
    errorState = "unreachable";
  }

  const byEmployee = new Map<number, AdminSession[]>();
  for (const s of sessions) {
    byEmployee.set(s.employee_id, [...(byEmployee.get(s.employee_id) ?? []), s]);
  }

  const columns: Column<{ employee_name: string; employee_login: string; sessionCount: number; lastCreated: string }>[] = [
    { header: "Mitarbeiter", cell: (r) => <span className="font-medium text-neutral-900">{r.employee_name}</span> },
    { header: "Login", cell: (r) => r.employee_login },
    { header: "Status", cell: () => <Badge tone="green">🟢 Online</Badge> },
    { header: "Aktive Sessions", cell: (r) => r.sessionCount },
    { header: "Neueste Session", cell: (r) => fmt(r.lastCreated) },
  ];

  const rows = Array.from(byEmployee.values()).map((group) => ({
    employee_name: group[0].employee_name,
    employee_login: group[0].employee_login,
    sessionCount: group.length,
    lastCreated: group.reduce((latest, s) => ((s.created_at ?? "") > latest ? s.created_at ?? latest : latest), group[0].created_at ?? ""),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Online Status</h1>
        <p className="text-sm text-neutral-400">
          Kein echtes Presence/Heartbeat-System — &quot;Online&quot; bedeutet: mindestens eine aktive, nicht abgelaufene Session.
        </p>
      </div>

      {errorState === "unreachable" && (
        <StateMessage title="PHÖNIX Backend nicht erreichbar" description="Die Verbindung zum Backend konnte nicht hergestellt werden." />
      )}
      {errorState === "forbidden" && (
        <StateMessage title="Keine Berechtigung" description="Für dieses Konto liegt keine Berechtigung vor." />
      )}
      {errorState === "error" && (
        <StateMessage title="Online-Status konnte nicht geladen werden" description="Ein unerwarteter Fehler ist aufgetreten." />
      )}

      {!errorState && (
        <Card>
          <DataTable columns={columns} rows={rows} rowKey={(r) => r.employee_login} emptyMessage="Aktuell niemand online" />
        </Card>
      )}
    </div>
  );
}
