import { cookies } from "next/headers";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import DataTable, { Column } from "@/components/ui/DataTable";
import InfoTooltip from "@/components/ui/InfoTooltip";
import StateMessage from "@/components/ui/StateMessage";
import { backendFetch, safeJson } from "@/lib/backend";
import { SESSION_COOKIE_NAME } from "@/lib/session";
import type { PushDevice } from "@/lib/types";

function fmt(value: unknown): string {
  if (value === null || value === undefined || value === "") return "–";
  return String(value);
}

export default async function DevicesPage() {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value ?? null;

  let devices: PushDevice[] = [];
  let errorState: "unreachable" | "forbidden" | "error" | null = null;

  try {
    const res = await backendFetch("/devices", { token });
    if (res.status === 403) {
      errorState = "forbidden";
    } else if (!res.ok) {
      errorState = "error";
    } else {
      const data = await safeJson<{ devices?: PushDevice[] }>(res);
      devices = data?.devices ?? [];
    }
  } catch {
    errorState = "unreachable";
  }

  const columns: Column<PushDevice>[] = [
    {
      header: "Installation-ID",
      info: "Eindeutige, anonyme Kennung für eine App-Installation auf einem Gerät (kein Nutzerkonto).",
      cell: (d) => (
        <Link href={`/users/devices/${encodeURIComponent(d.installation_id)}`} className="font-mono text-xs text-phoenix-gold-dark hover:underline">
          {d.installation_id.slice(0, 12)}…
        </Link>
      ),
    },
    { header: "Plattform", cell: (d) => fmt(d.platform) },
    { header: "Sprache", cell: (d) => fmt(d.locale) },
    { header: "Push", info: "Ob dieses Gerät generell Push-Benachrichtigungen (Meldungen auf dem Sperrbildschirm) erlaubt.", cell: (d) => <Badge tone={d.enabled ? "green" : "neutral"}>{d.enabled ? "An" : "Aus"}</Badge> },
    { header: "News-Push", info: "Ob dieses Gerät speziell Push-Benachrichtigungen für News erhält.", cell: (d) => <Badge tone={d.news_enabled ? "green" : "neutral"}>{d.news_enabled ? "An" : "Aus"}</Badge> },
    { header: "Favoriten", info: "Anzahl der Teams/Ligen, die auf diesem Gerät als Favorit markiert wurden.", cell: (d) => fmt(d.favorite_count) },
    { header: "Tickets", info: "Anzahl der Support-Anfragen, die von diesem Gerät geschickt wurden.", cell: (d) => fmt(d.ticket_count) },
    { header: "Zuletzt gesehen", cell: (d) => fmt(d.last_seen_at) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-1.5 text-xl font-semibold text-neutral-900">
          Geräte
          <InfoTooltip text="Liste aller Handys/Tablets, auf denen die PHÖNIX-App installiert ist — anonym, ohne dass jemand ein Konto anlegen musste." />
        </h1>
        <p className="text-sm text-neutral-400">
          PHÖNIX hat noch kein Nutzerkonto-System — dies sind anonyme App-Installationen (Installation-ID), keine
          Nutzerkonten. Premiumstatus, Sessions und Sperren setzen echte Accounts voraus und sind daher noch nicht
          verfügbar.
        </p>
      </div>

      {errorState === "unreachable" && (
        <StateMessage title="PHÖNIX Backend nicht erreichbar" description="Die Verbindung zum Backend konnte nicht hergestellt werden." />
      )}
      {errorState === "forbidden" && (
        <StateMessage title="Keine Berechtigung" description="Für dieses Konto liegt keine Berechtigung zum Anzeigen von Geräten vor." />
      )}
      {errorState === "error" && (
        <StateMessage title="Geräte konnten nicht geladen werden" description="Ein unerwarteter Fehler ist aufgetreten." />
      )}

      {!errorState && (
        <Card>
          <DataTable columns={columns} rows={devices} rowKey={(d) => d.installation_id} emptyMessage="Keine Geräte gefunden" />
        </Card>
      )}
    </div>
  );
}
