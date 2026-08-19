import { cookies } from "next/headers";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import DataTable, { Column } from "@/components/ui/DataTable";
import StateMessage from "@/components/ui/StateMessage";
import { backendFetch, safeJson } from "@/lib/backend";
import { SESSION_COOKIE_NAME } from "@/lib/session";
import type { AdCampaign } from "@/lib/types";

const SLOT_LABELS: Record<string, string> = {
  home_banner: "Startseite Banner",
  match_detail_infeed: "Matchdetail In-Feed",
  news_infeed: "News In-Feed",
};

export default async function AdStatsPage() {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value ?? null;

  let campaigns: AdCampaign[] = [];
  let errorState: "unreachable" | "forbidden" | "error" | null = null;

  try {
    const res = await backendFetch("/advertising/campaigns", { token });
    if (res.status === 403) {
      errorState = "forbidden";
    } else if (!res.ok) {
      errorState = "error";
    } else {
      const data = await safeJson<{ campaigns?: AdCampaign[] }>(res);
      campaigns = data?.campaigns ?? [];
    }
  } catch {
    errorState = "unreachable";
  }

  const totalImpressions = campaigns.reduce((sum, c) => sum + (c.impressions ?? 0), 0);
  const totalClicks = campaigns.reduce((sum, c) => sum + (c.clicks ?? 0), 0);

  const columns: Column<AdCampaign>[] = [
    { header: "Kampagne", cell: (c) => c.name },
    { header: "Slot", cell: (c) => SLOT_LABELS[c.slot] ?? c.slot },
    { header: "Status", cell: (c) => <Badge tone={c.active ? "green" : "neutral"}>{c.active ? "Aktiv" : "Pausiert"}</Badge> },
    { header: "Impressions", cell: (c) => c.impressions },
    { header: "Klicks", cell: (c) => c.clicks },
    {
      header: "CTR",
      cell: (c) => (c.impressions > 0 ? `${((c.clicks / c.impressions) * 100).toFixed(2)}%` : "–"),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Statistiken</h1>
        <p className="text-sm text-neutral-400">Impressions und Klicks je Kampagne.</p>
      </div>

      {errorState === "unreachable" && (
        <StateMessage title="PHÖNIX Backend nicht erreichbar" description="Die Verbindung zum Backend konnte nicht hergestellt werden." />
      )}
      {errorState === "forbidden" && (
        <StateMessage title="Keine Berechtigung" description="Für dieses Konto liegt keine Berechtigung vor." />
      )}
      {errorState === "error" && (
        <StateMessage title="Statistiken konnten nicht geladen werden" description="Ein unerwarteter Fehler ist aufgetreten." />
      )}

      {!errorState && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="rounded-md border border-neutral-100 bg-white px-4 py-3 shadow-sm">
              <p className="text-xs text-neutral-500">Gesamt-Impressions</p>
              <p className="mt-0.5 text-xl font-semibold text-neutral-900">{totalImpressions}</p>
            </div>
            <div className="rounded-md border border-neutral-100 bg-white px-4 py-3 shadow-sm">
              <p className="text-xs text-neutral-500">Gesamt-Klicks</p>
              <p className="mt-0.5 text-xl font-semibold text-neutral-900">{totalClicks}</p>
            </div>
            <div className="rounded-md border border-neutral-100 bg-white px-4 py-3 shadow-sm">
              <p className="text-xs text-neutral-500">Ø CTR</p>
              <p className="mt-0.5 text-xl font-semibold text-neutral-900">
                {totalImpressions > 0 ? `${((totalClicks / totalImpressions) * 100).toFixed(2)}%` : "–"}
              </p>
            </div>
          </div>

          <Card>
            <DataTable columns={columns} rows={campaigns} rowKey={(c) => String(c.id)} emptyMessage="Noch keine Kampagnen" />
          </Card>
        </>
      )}
    </div>
  );
}
