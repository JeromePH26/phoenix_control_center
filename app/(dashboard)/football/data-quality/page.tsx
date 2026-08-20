import Link from "next/link";
import Card from "@/components/ui/Card";
import InfoTooltip from "@/components/ui/InfoTooltip";
import StateMessage from "@/components/ui/StateMessage";
import { safeJson } from "@/lib/backend";
import { legacyBackendFetch } from "@/lib/legacyBackend";

interface WhitelistLeagueRow {
  league_id: string;
  league_name: string | null;
  country: string | null;
  competition_level: number | null;
  fixture_count: number;
  analysis_count: number;
  average_quality: number;
}

interface DataCoverageResponse {
  date: string;
  fixtures: number;
  analyses: number;
  coveragePercent: number;
  leagues: WhitelistLeagueRow[];
}

function levelLabel(level: number | null): string {
  if (level === 1) return "1. Liga (Top)";
  if (level === 2) return "2. Liga";
  if (level === 3) return "3. Liga";
  if (level == null) return "Pokal / International";
  return `Stufe ${level}`;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("de-DE", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

export default async function DataQualityPage() {
  let coverage: DataCoverageResponse | null = null;
  let errorState: "unreachable" | "error" | null = null;

  try {
    const res = await legacyBackendFetch("/football/data-coverage");
    if (!res.ok) {
      errorState = "error";
    } else {
      coverage = await safeJson<DataCoverageResponse>(res);
    }
  } catch {
    errorState = "unreachable";
  }

  const leagues = coverage?.leagues ?? [];
  const withFixtures = leagues.filter((l) => l.fixture_count > 0);
  const withoutFixtures = leagues.filter((l) => l.fixture_count === 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-1.5 text-xl font-semibold text-neutral-900">
          Datenqualität
          <InfoTooltip text="Zeigt für jede freigegebene (Whitelist-)Liga, wie viele Spiele heute gespeichert und analysiert wurden - und wie zuverlässig diese Analysen sind." />
        </h1>
        <p className="text-sm text-neutral-400">
          Abdeckungs-Report der Whitelist-Ligen{coverage ? ` für ${formatDate(coverage.date)}` : ""}.
        </p>
      </div>

      {errorState === "unreachable" && (
        <StateMessage
          title="PHÖNIX Backend nicht erreichbar"
          description="Die Verbindung zum Backend konnte nicht hergestellt werden."
        />
      )}
      {errorState === "error" && (
        <StateMessage title="Datenqualität konnte nicht geladen werden" description="Ein unerwarteter Fehler ist aufgetreten." />
      )}

      {!errorState && coverage && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card title="Gespeicherte Spiele heute">
              <p className="text-2xl font-semibold text-neutral-900">{coverage.fixtures}</p>
            </Card>
            <Card title="Davon analysiert">
              <p className="text-2xl font-semibold text-neutral-900">{coverage.analyses}</p>
            </Card>
            <Card
              title={
                <span className="inline-flex items-center gap-1">
                  Abdeckung
                  <InfoTooltip text="Anteil der heutigen Spiele in Whitelist-Ligen, für die bereits eine PHÖNIX-Analyse vorliegt." />
                </span>
              }
            >
              <p className="text-2xl font-semibold text-neutral-900">{coverage.coveragePercent.toFixed(1)} %</p>
            </Card>
          </div>

          <Card title={`Ligen mit heutigen Spielen (${withFixtures.length})`}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500">
                    <th className="py-2 pr-4 font-medium">Liga</th>
                    <th className="py-2 pr-4 font-medium">Land</th>
                    <th className="py-2 pr-4 font-medium">Stufe</th>
                    <th className="py-2 pr-4 font-medium">Gespeicherte Spiele</th>
                    <th className="py-2 pr-4 font-medium">Analysiert</th>
                    <th className="py-2 pr-4 font-medium">Ø Datenqualität</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {withFixtures.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-sm text-neutral-400">
                        Für heute liegen in keiner Whitelist-Liga Spiele vor.
                      </td>
                    </tr>
                  ) : (
                    withFixtures.map((l) => (
                      <tr key={l.league_id} className="hover:bg-neutral-50">
                        <td className="py-2.5 pr-4 align-top">
                          <Link href={`/football/leagues/${encodeURIComponent(l.league_id)}`} className="font-medium text-neutral-900 hover:underline">
                            {l.league_name ?? l.league_id}
                          </Link>
                        </td>
                        <td className="py-2.5 pr-4 align-top text-neutral-800">{l.country ?? "–"}</td>
                        <td className="py-2.5 pr-4 align-top text-neutral-800">{levelLabel(l.competition_level)}</td>
                        <td className="py-2.5 pr-4 align-top text-neutral-800">{l.fixture_count}</td>
                        <td className="py-2.5 pr-4 align-top text-neutral-800">{l.analysis_count}</td>
                        <td className="py-2.5 pr-4 align-top text-neutral-800">{l.average_quality} %</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <Card
            title={
              <span className="inline-flex items-center gap-1">
                Ligen ohne heutige Spiele ({withoutFixtures.length})
                <InfoTooltip text="Diese freigegebenen Ligen haben heute schlicht keine Partien im Spielplan - kein Datenproblem." />
              </span>
            }
          >
            <div className="flex flex-wrap gap-2">
              {withoutFixtures.map((l) => (
                <Link
                  key={l.league_id}
                  href={`/football/leagues/${encodeURIComponent(l.league_id)}`}
                  className="rounded-full border border-neutral-200 px-3 py-1 text-xs text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                >
                  {l.league_name ?? l.league_id}
                </Link>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
