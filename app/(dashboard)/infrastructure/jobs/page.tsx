import { cookies } from "next/headers";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import DataTable, { Column } from "@/components/ui/DataTable";
import InfoTooltip from "@/components/ui/InfoTooltip";
import JsonViewer from "@/components/ui/JsonViewer";
import StateMessage from "@/components/ui/StateMessage";
import { backendFetch, safeJson } from "@/lib/backend";
import { SESSION_COOKIE_NAME } from "@/lib/session";
import type { JobRow, JobsPayload } from "@/lib/types";

function statusTone(status: string): "green" | "red" | "gold" | "neutral" {
  if (status === "completed") return "green";
  if (status === "failed") return "red";
  if (status === "running") return "gold";
  return "neutral";
}

function fmt(value: unknown): string {
  if (value === null || value === undefined || value === "") return "–";
  return String(value);
}

const KNOWN_KEYS = new Set([
  "id",
  "status",
  "scan_date",
  "current_step",
  "processed",
  "published",
  "error",
  "created_at",
  "completed_at",
  "checked",
  "settled",
  "pending",
  "failed",
  "last_error",
  "trigger_type",
  "leagues_processed",
  "markets_processed",
  "challengers_created",
  "started_at",
]);

function extraColumn(row: JobRow) {
  const extra = Object.fromEntries(Object.entries(row).filter(([k]) => !KNOWN_KEYS.has(k)));
  return Object.keys(extra).length > 0 ? <JsonViewer value={extra} label="Details" /> : "–";
}

export default async function JobsPage() {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value ?? null;

  let jobs: JobsPayload | null = null;
  let errorState: "unreachable" | "forbidden" | "error" | null = null;

  try {
    const res = await backendFetch("/jobs", { token });
    if (res.status === 403) {
      errorState = "forbidden";
    } else if (!res.ok) {
      errorState = "error";
    } else {
      jobs = await safeJson<JobsPayload>(res);
    }
  } catch {
    errorState = "unreachable";
  }

  const dailyPipelineColumns: Column<JobRow>[] = [
    { header: "ID", cell: (j) => <span className="font-medium text-neutral-900">#{j.id}</span> },
    { header: "Status", info: "completed = fertig. running = läuft gerade. failed = fehlgeschlagen.", cell: (j) => <Badge tone={statusTone(j.status)}>{j.status}</Badge> },
    { header: "Datum", cell: (j) => fmt(j.scan_date) },
    { header: "Schritt", info: "An welcher Stelle des Ablaufs sich der Job gerade befindet.", cell: (j) => fmt(j.current_step) },
    { header: "Verarbeitet / Veröffentlicht", info: "Anzahl bereits bearbeiteter Datensätze / davon in der App sichtbar gemacht.", cell: (j) => `${fmt(j.processed)} / ${fmt(j.published)}` },
    { header: "Gestartet", cell: (j) => fmt(j.created_at) },
    { header: "Beendet", cell: (j) => fmt(j.completed_at) },
    { header: "Fehler", cell: (j) => (j.error ? <span className="text-red-600">{String(j.error)}</span> : "–") },
    { header: "Details", info: "Weitere technische Rohdaten zu diesem Lauf, aufklappbar.", cell: extraColumn },
  ];

  const settlementColumns: Column<JobRow>[] = [
    { header: "ID", cell: (j) => <span className="font-medium text-neutral-900">#{j.id}</span> },
    { header: "Status", info: "completed = fertig. running = läuft gerade. failed = fehlgeschlagen.", cell: (j) => <Badge tone={statusTone(j.status)}>{j.status}</Badge> },
    {
      header: "Fortschritt",
      info: "geprüft = angeschaut, abgerechnet = Tipp-Ergebnis final gebucht, offen = noch nicht dran, fehlgeschlagen = ging schief.",
      cell: (j) => `${fmt(j.checked)} geprüft · ${fmt(j.settled)} abgerechnet · ${fmt(j.pending)} offen · ${fmt(j.failed)} fehlgeschlagen`,
    },
    { header: "Gestartet", cell: (j) => fmt(j.created_at) },
    { header: "Beendet", cell: (j) => fmt(j.completed_at) },
    {
      header: "Letzter Fehler",
      cell: (j) => (j.last_error ? <span className="text-red-600">{String(j.last_error)}</span> : "–"),
    },
  ];

  const learningRunColumns: Column<JobRow>[] = [
    { header: "ID", cell: (j) => <span className="font-medium text-neutral-900">#{j.id}</span> },
    { header: "Status", info: "completed = fertig. running = läuft gerade. failed = fehlgeschlagen.", cell: (j) => <Badge tone={statusTone(j.status)}>{j.status}</Badge> },
    { header: "Auslöser", info: "Was diesen Lauf gestartet hat — manuell durch einen Mitarbeiter oder automatisch nach Zeitplan.", cell: (j) => fmt(j.trigger_type) },
    { header: "Schritt", info: "An welcher Stelle des Ablaufs sich der Job gerade befindet.", cell: (j) => fmt(j.current_step) },
    {
      header: "Ligen / Märkte / Challenger",
      info: "Anzahl bearbeiteter Ligen / bearbeiteter Wett-Kategorien / neu erstellter Herausforderer-Modelle (die gegen das aktuell beste Modell antreten).",
      cell: (j) => `${fmt(j.leagues_processed)} / ${fmt(j.markets_processed)} / ${fmt(j.challengers_created)}`,
    },
    { header: "Gestartet", cell: (j) => fmt(j.started_at) },
    { header: "Beendet", cell: (j) => fmt(j.completed_at) },
    { header: "Details", cell: extraColumn },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-1.5 text-xl font-semibold text-neutral-900">
          Jobs
          <InfoTooltip text="Automatische Hintergrund-Aufgaben, die PHÖNIX regelmäßig selbst ausführt (z.B. Spieldaten holen, Ergebnisse abrechnen)." />
        </h1>
        <p className="text-sm text-neutral-400">
          Letzte Läufe je Job-Typ: Daily-Pipeline (täglicher Football-Datenabruf), Ergebnis-Settlement (Tipp-Abrechnung), Model-Lab-Learning (Lernvorgang der Vorhersage-Modelle).
        </p>
      </div>

      {errorState === "unreachable" && (
        <StateMessage title="PHÖNIX Backend nicht erreichbar" description="Die Verbindung zum Backend konnte nicht hergestellt werden." />
      )}
      {errorState === "forbidden" && (
        <StateMessage title="Keine Berechtigung" description="Für dieses Konto liegt keine Berechtigung zum Anzeigen von Jobs vor." />
      )}
      {errorState === "error" && (
        <StateMessage title="Jobs konnten nicht geladen werden" description="Beim Laden der Daten ist ein Fehler aufgetreten." />
      )}

      {!errorState && (
        <>
          <Card title="Daily Pipeline (Football-Scan)">
            <DataTable
              columns={dailyPipelineColumns}
              rows={jobs?.dailyPipeline ?? []}
              rowKey={(j) => `pipeline-${j.id}`}
              emptyMessage="Noch keine Läufe"
            />
          </Card>

          <Card title="Ergebnis-Settlement">
            <DataTable
              columns={settlementColumns}
              rows={jobs?.settlement ?? []}
              rowKey={(j) => `settlement-${j.id}`}
              emptyMessage="Noch keine Läufe"
            />
          </Card>

          <Card title="Model-Lab Learning">
            <DataTable
              columns={learningRunColumns}
              rows={jobs?.learningRuns ?? []}
              rowKey={(j) => `learning-${j.id}`}
              emptyMessage="Noch keine Läufe"
            />
          </Card>
        </>
      )}
    </div>
  );
}
