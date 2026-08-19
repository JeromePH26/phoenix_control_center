"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import DataTable, { Column } from "@/components/ui/DataTable";
import InfoTooltip from "@/components/ui/InfoTooltip";
import StateMessage from "@/components/ui/StateMessage";
import type { AdCampaign } from "@/lib/types";

type LoadState = "loading" | "loaded" | "unreachable" | "error";

const SLOT_LABELS: Record<string, string> = {
  home_banner: "Startseite Banner",
  match_detail_infeed: "Matchdetail In-Feed",
  news_infeed: "News In-Feed",
};

const AUDIENCE_LABEL: Record<string, string> = {
  ALL: "Alle Nutzer",
  FREE: "Nur ohne Premium",
  PREMIUM: "Nur mit Premium",
};
function audienceLabel(audience: string): string {
  return AUDIENCE_LABEL[audience] ?? audience;
}

function fmt(value: unknown): string {
  if (value === null || value === undefined || value === "") return "–";
  return String(value);
}

export default function CampaignsListClient({ slotFilter }: { slotFilter?: string }) {
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [state, setState] = useState<LoadState>("loading");

  const load = useCallback(async () => {
    setState("loading");
    try {
      const qs = slotFilter ? `?slot=${slotFilter}` : "";
      const res = await fetch(`/api/advertising/campaigns${qs}`);
      if (res.status === 502) {
        setState("unreachable");
        return;
      }
      if (!res.ok) {
        setState("error");
        return;
      }
      const data = await res.json().catch(() => null);
      setCampaigns(Array.isArray(data?.campaigns) ? data.campaigns : []);
      setState("loaded");
    } catch {
      setState("unreachable");
    }
  }, [slotFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const columns: Column<AdCampaign>[] = [
    {
      header: "Name",
      cell: (c) => (
        <Link href={`/advertising/campaigns/${c.id}`} className="text-phoenix-gold-dark hover:underline">
          {c.name}
        </Link>
      ),
    },
    { header: "Slot", info: "An welcher Stelle in der App die Werbung angezeigt wird.", cell: (c) => SLOT_LABELS[c.slot] ?? c.slot },
    { header: "Aktiv", cell: (c) => <Badge tone={c.active ? "green" : "neutral"}>{c.active ? "Ja" : "Nein"}</Badge> },
    { header: "Zielgruppe", cell: (c) => audienceLabel(c.target_audience) },
    { header: "Zeitraum", cell: (c) => `${fmt(c.start_date)} – ${fmt(c.end_date)}` },
    { header: "Impressions", info: "Wie oft die Werbung angezeigt wurde.", cell: (c) => c.impressions },
    { header: "Klicks", info: "Wie oft jemand auf die Werbung geklickt hat.", cell: (c) => c.clicks },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="flex items-center gap-1.5 text-xl font-semibold text-neutral-900">
            Kampagnen
            <InfoTooltip text="Werbeanzeigen, die in der App an bestimmten Stellen (Slots) eingeblendet werden." />
          </h1>
          <p className="text-sm text-neutral-400">
            Werbe-Slots (Anzeigeplätze) sind serverseitig fest vordefiniert. Noch nicht in der App verbunden.
          </p>
        </div>
        <Link href="/advertising/campaigns/new">
          <Button>Neue Kampagne</Button>
        </Link>
      </div>

      <Card>
        {state === "loading" && <p className="py-8 text-center text-sm text-neutral-400">Wird geladen…</p>}
        {state === "unreachable" && (
          <StateMessage title="PHÖNIX Backend nicht erreichbar" description="Die Verbindung zum Backend konnte nicht hergestellt werden." />
        )}
        {state === "error" && (
          <StateMessage title="Kampagnen konnten nicht geladen werden" description="Ein unerwarteter Fehler ist aufgetreten." />
        )}
        {state === "loaded" && (
          <DataTable columns={columns} rows={campaigns} rowKey={(c) => String(c.id)} emptyMessage="Noch keine Kampagnen" />
        )}
      </Card>
    </div>
  );
}
