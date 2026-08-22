import InfoTooltip from "@/components/ui/InfoTooltip";
import NotConfiguredState from "@/components/ui/NotConfiguredState";

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

      <NotConfiguredState
        title="Status"
        reason="Der Backend-Server hat keinen Railway-API-Zugriff und kann seinen eigenen Deployment-/Service-Status nicht selbst abfragen — nur über die Railway-CLI/Weboberfläche außerhalb dieser App einsehbar."
        requirements={[
          "Ein Railway API-Token mit Lesezugriff auf das Projekt als Backend-Secret hinterlegen",
          "Einen Admin-Endpunkt bauen, der die Railway GraphQL-API abfragt (Deployments, Service-Status, letzte Builds)",
        ]}
      />
    </div>
  );
}
