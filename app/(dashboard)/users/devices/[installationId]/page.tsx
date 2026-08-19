import { cookies } from "next/headers";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import DataTable, { Column } from "@/components/ui/DataTable";
import KeyValueList from "@/components/ui/KeyValueList";
import StateMessage from "@/components/ui/StateMessage";
import { backendFetch, safeJson } from "@/lib/backend";
import { SESSION_COOKIE_NAME } from "@/lib/session";
import type { PushDevice, SupportTicket } from "@/lib/types";

function fmt(value: unknown): string {
  if (value === null || value === undefined || value === "") return "–";
  return String(value);
}

export default async function DeviceDetailPage({ params }: { params: { installationId: string } }) {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value ?? null;

  let device: PushDevice | null = null;
  let tickets: SupportTicket[] = [];
  let errorState: "unreachable" | "forbidden" | "notfound" | "error" | null = null;

  try {
    const res = await backendFetch(`/devices/${encodeURIComponent(params.installationId)}`, { token });
    if (res.status === 403) {
      errorState = "forbidden";
    } else if (res.status === 404) {
      errorState = "notfound";
    } else if (!res.ok) {
      errorState = "error";
    } else {
      const data = await safeJson<{ device?: PushDevice; tickets?: SupportTicket[] }>(res);
      device = data?.device ?? null;
      tickets = data?.tickets ?? [];
    }
  } catch {
    errorState = "unreachable";
  }

  const ticketColumns: Column<SupportTicket>[] = [
    {
      header: "Betreff",
      cell: (t) => (
        <Link href={`/support/tickets/${t.id}`} className="text-phoenix-gold-dark hover:underline">
          {t.subject}
        </Link>
      ),
    },
    { header: "Kategorie", cell: (t) => fmt(t.category) },
    { header: "Status", cell: (t) => <Badge tone="neutral">{t.status}</Badge> },
    { header: "Erstellt", cell: (t) => fmt(t.created_at) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/users/devices" className="text-xs text-neutral-400 hover:text-neutral-600">
          ← Zurück zu Geräten
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-neutral-900">Gerät</h1>
      </div>

      {errorState === "unreachable" && (
        <StateMessage title="PHÖNIX Backend nicht erreichbar" description="Die Verbindung zum Backend konnte nicht hergestellt werden." />
      )}
      {errorState === "forbidden" && (
        <StateMessage title="Keine Berechtigung" description="Für dieses Konto liegt keine Berechtigung vor." />
      )}
      {errorState === "notfound" && <StateMessage title="Gerät nicht gefunden" description="Für diese Installation-ID liegen keine Daten vor." />}
      {errorState === "error" && (
        <StateMessage title="Gerät konnte nicht geladen werden" description="Ein unerwarteter Fehler ist aufgetreten." />
      )}

      {!errorState && device && (
        <>
          <Card title="Übersicht" action={<Badge tone={device.enabled ? "green" : "neutral"}>{device.enabled ? "Push An" : "Push Aus"}</Badge>}>
            <KeyValueList
              data={{
                "Installation-ID": device.installation_id,
                Plattform: device.platform,
                Sprache: device.locale,
                "News-Push": device.news_enabled,
                Erstellt: device.created_at,
                Aktualisiert: device.updated_at,
                "Zuletzt gesehen": device.last_seen_at,
              }}
            />
          </Card>

          <Card title="Support-Tickets">
            <DataTable columns={ticketColumns} rows={tickets} rowKey={(t) => String(t.id)} emptyMessage="Keine Tickets von diesem Gerät" />
          </Card>
        </>
      )}
    </div>
  );
}
