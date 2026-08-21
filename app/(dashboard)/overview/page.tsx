import { cookies } from "next/headers";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import InfoTooltip from "@/components/ui/InfoTooltip";
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

interface WarningItem {
  label: string;
  count: number;
  href: string;
}

// Section 5: echter Warnbereich oben auf der Übersicht - nur Kacheln, deren
// Zahl auch tatsächlich > 0 ist, werden angezeigt. Kein "API-Limit
// kritisch"-Eintrag, solange kein reales Tageslimit in der Datenbank
// existiert (siehe Section 25) - keine erfundene Prozentzahl.
function WarningBanner({ items }: { items: WarningItem[] }) {
  const active = items.filter((i) => i.count > 0);
  if (active.length === 0) return null;
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
      <p className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-amber-700">
        Achtung
        <InfoTooltip text="Punkte, die gerade Aufmerksamkeit brauchen könnten - kein Alarm, nur ein Hinweis." />
      </p>
      <div className="flex flex-wrap gap-2">
        {active.map((i) => (
          <a
            key={i.label}
            href={i.href}
            className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-white px-2.5 py-1.5 text-sm text-amber-800 hover:bg-amber-100"
          >
            <span className="font-semibold">{i.count}</span>
            {i.label}
          </a>
        ))}
      </div>
    </div>
  );
}

function jobStatusTone(count: number, kind: "failed" | "running"): "neutral" | "warning" | "bad" {
  if (count === 0) return "neutral";
  return kind === "failed" ? "bad" : "warning";
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

  const dailyPipeline = overview?.pendingJobs?.dailyPipeline;
  const settlement = overview?.pendingJobs?.settlement;
  const apiUsageToday = overview?.apiUsage ?? [];
  const lastRun = overview?.modelLab?.lastLearningRun;

  const warnings: WarningItem[] = [
    { label: "fehlgeschlagene Pipeline-Läufe (24h)", count: dailyPipeline?.failed24h ?? 0, href: "/infrastructure/jobs" },
    { label: "fehlgeschlagene Settlements (24h)", count: settlement?.failed24h ?? 0, href: "/infrastructure/jobs" },
    { label: "offene Settlements", count: overview?.footballToday?.openSettlementJobs ?? 0, href: "/football/settlement" },
    { label: "Spiele mit niedriger Datenqualität heute", count: overview?.footballToday?.lowDataQuality ?? 0, href: "/football/data-quality" },
    { label: "Whitelist-Ligen ohne Wappen", count: overview?.warnings?.missingLeagueLogos ?? 0, href: "/football/assets" },
  ];

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

      {!errorState && <WarningBanner items={warnings} />}

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
          <Card
            title={
              <a href="/infrastructure/api-usage" className="hover:underline">
                API Usage
              </a>
            }
          >
            {apiUsageToday.length === 0 ? (
              <p className="text-sm text-neutral-400">Keine Anfragen heute</p>
            ) : (
              <dl className="space-y-1.5">
                {apiUsageToday.map((row) => (
                  <div key={row.api_name} className="flex items-baseline justify-between gap-4 text-sm">
                    <dt className="text-neutral-500">{row.api_name}</dt>
                    <dd className="font-medium text-neutral-900">{row.requests} Requests</dd>
                  </div>
                ))}
              </dl>
            )}
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
                <StatTile label="Auto" value={overview.whitelist.auto as number | null} href="/football/leagues" />
                <StatTile label="Whitelist" value={overview.whitelist.whitelist as number | null} href="/football/leagues" />
                <StatTile label="Blacklist" value={overview.whitelist.blacklist as number | null} href="/football/leagues" />
              </div>
            ) : (
              <p className="text-sm text-neutral-400">Keine Daten</p>
            )}
          </Card>

          <Card
            title={
              <a href="/model-lab/learning" className="inline-flex items-center gap-1 hover:underline">
                Model Lab
                <InfoTooltip text="Kennzahlen zu den selbstlernenden Vorhersage-Modellen von PHÖNIX." />
              </a>
            }
          >
            {overview?.modelLab ? (
              <div className="space-y-2">
                <dl className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-4 text-sm">
                    <dt className="text-neutral-500">Whitelist-Ligen</dt>
                    <dd className="font-medium text-neutral-900">{overview.modelLab.whitelistLeagues ?? "–"}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4 text-sm">
                    <dt className="text-neutral-500">Aktive Champions</dt>
                    <dd className="font-medium text-neutral-900">{overview.modelLab.activeChampions ?? "–"}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4 text-sm">
                    <dt className="text-neutral-500">Herausforderer</dt>
                    <dd className="font-medium text-neutral-900">{overview.modelLab.activeChallengers ?? "–"}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4 text-sm">
                    <dt className="text-neutral-500">Lernfähige Spiele</dt>
                    <dd className="font-medium text-neutral-900">{overview.modelLab.learningEligibleMatches ?? "–"}</dd>
                  </div>
                </dl>
                {lastRun && (
                  <div className="border-t border-neutral-100 pt-2">
                    <p className="mb-1 text-xs font-medium text-neutral-500">Letzter Learning-Run</p>
                    <dl className="space-y-1.5">
                      <div className="flex items-baseline justify-between gap-4 text-sm">
                        <dt className="text-neutral-500">Status</dt>
                        <dd>
                          <Badge tone={lastRun.status === "completed" ? "green" : lastRun.status === "failed" ? "red" : "gold"}>
                            {lastRun.status === "completed" ? "Abgeschlossen" : lastRun.status === "failed" ? "Fehlgeschlagen" : (lastRun.status ?? "–")}
                          </Badge>
                        </dd>
                      </div>
                      <div className="flex items-baseline justify-between gap-4 text-sm">
                        <dt className="text-neutral-500">Verarbeitete Ligen</dt>
                        <dd className="font-medium text-neutral-900">{lastRun.leagues_processed ?? "–"}</dd>
                      </div>
                      <div className="flex items-baseline justify-between gap-4 text-sm">
                        <dt className="text-neutral-500">Neue Herausforderer</dt>
                        <dd className="font-medium text-neutral-900">{lastRun.challengers_created ?? 0}</dd>
                      </div>
                    </dl>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-neutral-400">Keine Daten</p>
            )}
          </Card>

          <Card
            title={
              <a href="/infrastructure/jobs" className="inline-flex items-center gap-1 hover:underline">
                Pending Jobs
                <InfoTooltip text="Hintergrund-Aufgaben: aktuell laufend, zuletzt fehlgeschlagen oder zuletzt abgeschlossen (jeweils letzte 24 Stunden)." />
              </a>
            }
          >
            <div className="space-y-3">
              <div>
                <p className="mb-1 text-xs font-medium text-neutral-500">Daily Pipeline</p>
                <div className="grid grid-cols-3 gap-2">
                  <StatTile label="Läuft" value={dailyPipeline?.running} tone={jobStatusTone(dailyPipeline?.running ?? 0, "running")} href="/infrastructure/jobs" />
                  <StatTile label="Fehlgeschlagen (24h)" value={dailyPipeline?.failed24h} tone={jobStatusTone(dailyPipeline?.failed24h ?? 0, "failed")} href="/infrastructure/jobs" />
                  <StatTile label="Abgeschlossen (24h)" value={dailyPipeline?.completed24h} tone="good" href="/infrastructure/jobs" />
                </div>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-neutral-500">Settlement</p>
                <div className="grid grid-cols-3 gap-2">
                  <StatTile label="Läuft" value={settlement?.running} tone={jobStatusTone(settlement?.running ?? 0, "running")} href="/football/settlement" />
                  <StatTile label="Fehlgeschlagen (24h)" value={settlement?.failed24h} tone={jobStatusTone(settlement?.failed24h ?? 0, "failed")} href="/football/settlement" />
                  <StatTile label="Abgeschlossen (24h)" value={settlement?.completed24h} tone="good" href="/football/settlement" />
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
