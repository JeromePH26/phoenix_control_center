import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import InfoTooltip from "@/components/ui/InfoTooltip";

export default function EmailCenterPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-1.5 text-xl font-semibold text-neutral-900">
          E-Mail
          <InfoTooltip text="Geplanter Bereich, um Firmen-E-Mails (z.B. support@) direkt hier im Control Center zu lesen und zu beantworten. Noch nicht aktiv." />
        </h1>
        <p className="text-sm text-neutral-400">Zentrales PHÖNIX Mail-Center für persönliche und geteilte Postfächer.</p>
      </div>

      <Card title="Status" action={<Badge tone="red">NOT CONFIGURED</Badge>}>
        <div className="space-y-3 text-sm text-neutral-700">
          <p>
            Ein eigener Mailserver wird bewusst nicht gebaut (Produktvorgabe). Das Mail-Center braucht eine
            OAuth-Anbindung an einen bestehenden Provider — Google Workspace oder Microsoft 365 — bevor hier irgendetwas
            live gehen kann.
          </p>
          <p className="font-medium text-neutral-900">Was fehlt, um das freizuschalten:</p>
          <ul className="list-disc space-y-1 pl-5 text-neutral-600">
            <li>Entscheidung für einen Provider (Google Workspace oder Microsoft 365)</li>
            <li>OAuth-App/Client beim Provider registrieren</li>
            <li>Postfächer anlegen: persönliche Mitarbeiterpostfächer (vorname.nachname@…) sowie die geteilten Postfächer support@, bugs@, billing@, business@</li>
            <li>Zugangsdaten/Client-Secrets als Railway-Variablen hinterlegen (niemals in der Datenbank)</li>
          </ul>
          <p>
            Sobald der Provider feststeht, wird hier eine echte Postfach-Integration (Posteingang, Antworten, Zuweisung
            an Nutzer/Tickets) gebaut — keine vorgetäuschten Daten, bis die Anbindung tatsächlich funktioniert.
          </p>
        </div>
      </Card>
    </div>
  );
}
