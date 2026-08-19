import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import InfoTooltip from "@/components/ui/InfoTooltip";

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

      <Card title="Status" action={<Badge tone="red">NOT CONFIGURED</Badge>}>
        <div className="space-y-3 text-sm text-neutral-700">
          <p>
            Railway betreibt automatische Postgres-Backups, aber der Backend-Server hat keinen API-Zugriff, um Backup-
            Metadaten (Zeitpunkt, Größe, Erfolg) selbst abzufragen. Es gibt aktuell auch keinen dokumentierten Restore-
            Test.
          </p>
          <p className="font-medium text-neutral-900">Was fehlt, um das freizuschalten:</p>
          <ul className="list-disc space-y-1 pl-5 text-neutral-600">
            <li>Railway API-Token mit Zugriff auf Backup-Metadaten des Postgres-Service</li>
            <li>Ein Admin-Endpunkt, der diese Metadaten abfragt und hier anzeigt</li>
            <li>Ein dokumentierter, regelmäßiger Restore-Test (kein &quot;leichtfertiger Production-Reset&quot;-Button, per Vorgabe)</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
