import InfoTooltip from "@/components/ui/InfoTooltip";
import NotConfiguredState from "@/components/ui/NotConfiguredState";

export default function BackupsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-1.5 text-xl font-semibold text-neutral-900">
          Backups
          <InfoTooltip text="Backup = automatisch gespeicherte Sicherheitskopie aller Daten, damit im Notfall nichts verloren geht." />
        </h1>
        <p className="text-sm text-neutral-400">Letztes Backup, Alter, Größe, Wiederherstellungs-Test.</p>
      </div>

      <NotConfiguredState
        title="Status"
        reason="Railway betreibt automatische Postgres-Backups, aber der Backend-Server hat keinen API-Zugriff, um Backup-Metadaten (Zeitpunkt, Größe, Erfolg) selbst abzufragen. Es gibt auch keinen dokumentierten Restore-Test."
        requirements={[
          "Railway API-Token mit Zugriff auf Backup-Metadaten des Postgres-Service",
          "Admin-Endpunkt, der letzter Erfolg, Alter und Größe des jeweils letzten Backups abfragt und hier anzeigt",
          "Ein dokumentierter, regelmäßiger Restore-Test mit verlinktem Runbook (kein \"leichtfertiger Production-Reset\"-Button, per Vorgabe)",
        ]}
      />
    </div>
  );
}
