import { cookies } from "next/headers";
import Card from "@/components/ui/Card";
import InfoTooltip from "@/components/ui/InfoTooltip";
import KeyValueList from "@/components/ui/KeyValueList";
import StateMessage from "@/components/ui/StateMessage";
import { backendFetch, safeJson } from "@/lib/backend";
import { SESSION_COOKIE_NAME } from "@/lib/session";
import type { OverviewPayload } from "@/lib/types";

function StatTile({
  label,
  value,
  tone = "neutral",
  href,
}: {
  label: string;
  value: number | null | undefined;
  tone?: "neutral" | "good" | "warning" | "bad";
  href?: string;
}) {
  const toneClasses: Record<string, string> = {
    neutral: "border-neutral-100 bg-neutral-50 text-neutral-900",
    good: "border-emerald-100 bg-emerald-50 text-emerald-700",
    warning: "border-amber-100 bg-amber-50 text-amber-700",
    bad: "border-red-100 bg-red-50 text-red-700",
  };
  const content = (
    <div className={`rounded-md border px-3 py-2.5 ${toneClasses[tone]}`}>
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-0.5 text-xl font-semibold">
        {value === null || value === undefined ? "–" : value}
      </p>
    </div>
  );
  if (!href) return content;
  return (
    <a href={href} className="block transition hover:opacity-80">
      {content}
    </a>
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
        <h1 className="flex items-center gap-1.5 text-xl font-semibold text-neutral-900">
          Overview
          <InfoTooltip text="Startseite mit dem aktuellen Gesamtzustand von PHÖNIX auf einen Blick." />
        </h1>
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
        <Card
          title={
            <span className="inline-flex items-center gap-1">
              Heute
              <InfoTooltip text="Was PHÖNIX heute (Berliner Kalendertag) für den Fußball-Bereich tatsächlich getan hat - direkt aus der Datenbank, nicht geschätzt." />
            </span>
          }
        >
          {overview?.footballToday ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              <StatTile
                label="Neue Analysen heute"
                value={overview.footballToday.newAnalysesToday}
                href="/football/matches"
              />
              <StatTile
                label="PHÖNIX Tipps heute"
                value={overview.footballToday.tipsToday}
                tone="good"
                href="/football/matches"
              />
              <StatTile
                label="Spiele ohne Empfehlung"
                value={overview.footballToday.matchesWithoutRecommendation}
                tone={
                  (overview.footballToday.matchesWithoutRecommendation ?? 0) > 0
                    ? "warning"
                    : "neutral"
                }
                href="/football/matches"
              />
              <StatTile
                label="Analyse läuft"
                value={overview.footballToday.analysisRunning}
                href="/infrastructure/jobs"
              />
              <StatTile
                label="Fehlgeschlagen"
                value={overview.footballToday.analysisFailed}
                tone={(overview.footballToday.analysisFailed ?? 0) > 0 ? "bad" : "neutral"}
                href="/infrastructure/jobs"
              />
              <StatTile
                label="Datenqualität zu niedrig"
                value={overview.footballToday.lowDataQuality}
                tone={(overview.footballToday.lowDataQuality ?? 0) > 0 ? "warning" : "neutral"}
                href="/football/data-quality"
              />
              <StatTile
                label="Neue Value-Signale"
                value={overview.footballToday.newValueSignals}
                tone="good"
                href="/football/matches"
              />
              <StatTile
                label="Offene Settlements"
                value={overview.footballToday.openSettlementJobs}
                href="/football/settlement"
              />
              <StatTile
                label="Geplante Spiele heute"
                value={overview.footballToday.scheduledMatches}
                href="/football/matches"
              />
              <StatTile
                label="Aktive Live-Spiele"
                value={overview.today?.activeLiveMatches}
                tone="good"
              />
              <StatTile
                label="Aktive Supportfälle"
                value={overview.today?.activeSupportCases}
                tone={(overview.today?.activeSupportCases ?? 0) > 0 ? "warning" : "neutral"}
                href="/support/tickets"
              />
              <StatTile
                label="Aktive Nutzer (24h)"
                value={overview.today?.activeUsers}
                href="/users/accounts"
              />
            </div>
          ) : (
            <p className="text-sm text-neutral-400">Keine Daten verfügbar</p>
          )}
        </Card>
      )}

      {!errorState && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card title="API Usage" className="xl:col-span-1">
            <KeyValueList data={overview?.apiUsage ?? null} />
          </Card>

          <Card
            title={
              <span className="inline-flex items-center gap-1">
                Whitelist
                <InfoTooltip text="Wie viele Ligen automatisch entschieden, manuell freigegeben (Whitelist) oder manuell gesperrt (Blacklist) sind." />
              </span>
            }
          >
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

          <Card
            title={
              <span className="inline-flex items-center gap-1">
                Model Lab
                <InfoTooltip text="Kennzahlen zu den selbstlernenden Vorhersage-Modellen von PHÖNIX." />
              </span>
            }
          >
            <KeyValueList data={overview?.modelLab ?? null} />
          </Card>

          <Card
            title={
              <span className="inline-flex items-center gap-1">
                Pending Jobs
                <InfoTooltip text="Hintergrund-Aufgaben, die gerade laufen oder noch nicht fertig sind." />
              </span>
            }
          >
            <KeyValueList data={overview?.pendingJobs ?? null} />
          </Card>
        </div>
      )}
    </div>
  );
}
