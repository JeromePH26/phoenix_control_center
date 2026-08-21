import Link from "next/link";
import { cookies } from "next/headers";
import Badge from "@/components/ui/Badge";
import InfoTooltip from "@/components/ui/InfoTooltip";
import StateMessage from "@/components/ui/StateMessage";
import { backendFetch, safeJson } from "@/lib/backend";
import { SESSION_COOKIE_NAME } from "@/lib/session";
import type { SystemHealth } from "@/lib/types";

function Tile({ label, value, tone, href }: { label: string; value: string | number; tone: "red" | "gold" | "green" | "neutral"; href?: string }) {
  const toneClasses: Record<string, string> = {
    red: "border-red-200 bg-red-50",
    gold: "border-phoenix-gold/30 bg-phoenix-gold/5",
    green: "border-emerald-200 bg-emerald-50",
    neutral: "border-neutral-200 bg-white",
  };
  const content = (
    <div className={`rounded-lg border px-4 py-3 shadow-sm ${toneClasses[tone]}`}>
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-neutral-900">{value}</p>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

export default async function OperationsPage() {
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

  // Section 5/25: `requests` ist eine rohe Anfragen-Anzahl, kein Prozentwert
  // - es gibt aktuell kein reales Tageslimit in der Datenbank, gegen das man
  // rechnen könnte (siehe Section 25, noch nicht gebaut). Die Kachel zeigt
  // deshalb ehrlich die Anzahl statt eine erfundene "%"-Zahl vorzutäuschen.
  const maxApiRequests = health ? Math.max(0, ...health.apiUsage.map((r) => (r.requests as number) ?? 0)) : 0;
  const pendingJobsTotal = health ? health.pendingJobs.footballDailyPipeline + health.pendingJobs.footballMatchSettlement : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-1.5 text-xl font-semibold text-neutral-900">
          PHÖNIX Operations
          <InfoTooltip text="Eine Kachel-Übersicht, die dir sofort zeigt, wo gerade etwas ansteht — grün heißt alles gut, rot/gold heißt: hinschauen." />
        </h1>
        <p className="text-sm text-neutral-400">Was gerade Aufmerksamkeit braucht — auf einen Blick.</p>
      </div>

      {errorState === "unreachable" && (
        <StateMessage title="PHÖNIX Backend nicht erreichbar" description="Die Verbindung zum Backend konnte nicht hergestellt werden." />
      )}
      {errorState === "forbidden" && (
        <StateMessage title="Keine Berechtigung" description="Für dieses Konto liegt keine Berechtigung vor." />
      )}
      {errorState === "error" && (
        <StateMessage title="Operations-Daten konnten nicht geladen werden" description="Ein unerwarteter Fehler ist aufgetreten." />
      )}

      {!errorState && health && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Tile
            label="Kritisch"
            value={health.openIncidentCount}
            tone={health.openIncidentCount > 0 ? "red" : "green"}
            href="/infrastructure/incidents"
          />
          <Tile
            label="Offene Tickets"
            value={health.openTicketCount}
            tone={health.openTicketCount > 0 ? "gold" : "green"}
            href="/support/tickets"
          />
          <Tile
            label="Offene Jobs"
            value={pendingJobsTotal}
            tone={pendingJobsTotal > 0 ? "gold" : "green"}
            href="/infrastructure/jobs"
          />
          <Tile
            label="API-Anfragen heute (höchste Quelle)"
            value={maxApiRequests}
            tone="neutral"
            href="/infrastructure/api-usage"
          />
          <Tile
            label="App-Status"
            value={health.appStatus.status as string}
            tone={health.appStatus.status === "ACTIVE" ? "green" : "red"}
            href="/app-control/status"
          />
          <Tile label="DB-Größe" value={`${Math.round(health.database.sizeBytes / (1024 * 1024))} MB`} tone="neutral" href="/infrastructure/database" />
        </div>
      )}

      {!errorState && health && health.openIncidentCount === 0 && health.openTicketCount === 0 && pendingJobsTotal === 0 && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
          <Badge tone="green">Alles im grünen Bereich</Badge>
        </div>
      )}
    </div>
  );
}
