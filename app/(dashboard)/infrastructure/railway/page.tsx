import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import InfoTooltip from "@/components/ui/InfoTooltip";

export default function RailwayStatusPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-1.5 text-xl font-semibold text-neutral-900">
          Railway
          <InfoTooltip text="Railway ist der externe Dienstleister, bei dem der PHÖNIX-Server und die Datenbank laufen (vergleichbar mit einem Hosting-Anbieter)." />
        </h1>
        <p className="text-sm text-neutral-400">Status: läuft der Server/die Datenbank gerade und wann wurde zuletzt etwas ausgerollt.</p>
      </div>

      <Card title="Status" action={<Badge tone="red">NOT CONFIGURED</Badge>}>
        <div className="space-y-3 text-sm text-neutral-700">
          <p>
            Der Backend-Server hat aktuell keinen Railway-API-Zugriff — er kann seinen eigenen Deployment-/Service-
            Status nicht selbst abfragen. Das Control Center kann Railway-Zustände nur über die Railway-CLI/Weboberfläche
            außerhalb der App einsehen.
          </p>
          <p className="font-medium text-neutral-900">Was fehlt, um das freizuschalten:</p>
          <ul className="list-disc space-y-1 pl-5 text-neutral-600">
            <li>Ein Railway API-Token mit Lesezugriff auf das Projekt als Backend-Secret hinterlegen</li>
            <li>Einen Admin-Endpunkt bauen, der die Railway GraphQL-API abfragt (Deployments, Service-Status, letzte Builds)</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
