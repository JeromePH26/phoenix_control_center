import InfoTooltip from "@/components/ui/InfoTooltip";
import NotConfiguredState from "@/components/ui/NotConfiguredState";

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

      <NotConfiguredState
        title="Status"
        reason="Braucht eine OAuth-Anbindung an Google Workspace oder Microsoft 365, bevor hier echte Postfächer erscheinen können — ein eigener Mailserver wird bewusst nicht gebaut."
        requirements={[
          "Entscheidung für einen Provider (Google Workspace oder Microsoft 365)",
          "OAuth-App/Client beim Provider registrieren",
          "Postfächer anlegen: persönliche Mitarbeiterpostfächer sowie die geteilten Postfächer support@, bugs@, billing@, business@",
          "Zugangsdaten/Client-Secrets als Railway-Variablen hinterlegen (niemals in der Datenbank)",
        ]}
      />
    </div>
  );
}
