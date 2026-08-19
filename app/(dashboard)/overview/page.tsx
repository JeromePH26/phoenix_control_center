import { cookies } from "next/headers";
import Card from "@/components/ui/Card";
import KeyValueList from "@/components/ui/KeyValueList";
import StateMessage from "@/components/ui/StateMessage";
import { backendFetch, safeJson } from "@/lib/backend";
import { SESSION_COOKIE_NAME } from "@/lib/session";
import type { OverviewPayload } from "@/lib/types";

function StatTile({ label, value }: { label: string; value: number | null | undefined }) {
  return (
    <div className="rounded-md border border-neutral-100 bg-neutral-50 px-3 py-2.5">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-0.5 text-xl font-semibold text-neutral-900">
        {value === null || value === undefined ? "–" : value}
      </p>
    </div>
  );
}

export default async function OverviewPage() {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value ?? null;

  let overview: OverviewPayload | null = null;
  let errorState: "unreachable" | "forbidden" | "error" | null = null;

  try {
    const res = await backendFetch("/overview", { token });
    if (res.status === 403) {
      errorState = "forbidden";
    } else if (!res.ok) {
      errorState = "error";
    } else {
      overview = await safeJson<OverviewPayload>(res);
    }
  } catch {
    errorState = "unreachable";
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Overview</h1>
        <p className="text-sm text-neutral-400">Aktueller Systemstatus von PHÖNIX.</p>
      </div>

      {errorState === "unreachable" && (
        <StateMessage
          title="PHÖNIX Backend nicht erreichbar"
          description="Die Verbindung zum Backend konnte nicht hergestellt werden. Bitte später erneut versuchen."
        />
      )}
      {errorState === "forbidden" && (
        <StateMessage
          title="Keine Berechtigung"
          description="Für dieses Konto liegt keine Berechtigung zum Anzeigen der Übersicht vor."
        />
      )}
      {errorState === "error" && (
        <StateMessage
          title="Übersicht konnte nicht geladen werden"
          description="Beim Laden der Daten ist ein Fehler aufgetreten."
        />
      )}

      {!errorState && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card title="API Usage" className="xl:col-span-1">
            <KeyValueList data={overview?.apiUsage ?? null} />
          </Card>

          <Card title="Whitelist">
            {overview?.whitelist ? (
              <div className="grid grid-cols-3 gap-2">
                <StatTile label="Auto" value={overview.whitelist.auto as number | null} />
                <StatTile label="Whitelist" value={overview.whitelist.whitelist as number | null} />
                <StatTile label="Blacklist" value={overview.whitelist.blacklist as number | null} />
              </div>
            ) : (
              <p className="text-sm text-neutral-400">Keine Daten</p>
            )}
          </Card>

          <Card title="Model Lab">
            <KeyValueList data={overview?.modelLab ?? null} />
          </Card>

          <Card title="Pending Jobs">
            <KeyValueList data={overview?.pendingJobs ?? null} />
          </Card>
        </div>
      )}
    </div>
  );
}
