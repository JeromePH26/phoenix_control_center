import { cookies } from "next/headers";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import StateMessage from "@/components/ui/StateMessage";
import { backendFetch, safeJson } from "@/lib/backend";
import { SESSION_COOKIE_NAME } from "@/lib/session";
import type { AdCampaign } from "@/lib/types";

const SLOTS: { value: string; label: string; description: string }[] = [
  { value: "home_banner", label: "Startseite Banner", description: "Werbebanner auf der Startseite der App." },
  { value: "match_detail_infeed", label: "Matchdetail In-Feed", description: "In-Feed-Platzierung auf der Match-Detailseite." },
  { value: "news_infeed", label: "News In-Feed", description: "In-Feed-Platzierung im News-Feed." },
];

export default async function AdSlotsPage() {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Werbeflächen</h1>
        <p className="text-sm text-neutral-400">
          Fest vordefinierte Slots — keine freie Layoutänderung vom Server (Section 32). Noch nicht in der App verbunden.
        </p>
      </div>

      {errorState === "unreachable" && (
        <StateMessage title="PHÖNIX Backend nicht erreichbar" description="Die Verbindung zum Backend konnte nicht hergestellt werden." />
      )}
      {errorState === "forbidden" && (
        <StateMessage title="Keine Berechtigung" description="Für dieses Konto liegt keine Berechtigung vor." />
      )}
      {errorState === "error" && (
        <StateMessage title="Werbeflächen konnten nicht geladen werden" description="Ein unerwarteter Fehler ist aufgetreten." />
      )}

      {!errorState && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {SLOTS.map((slot) => {
            const slotCampaigns = campaigns.filter((c) => c.slot === slot.value);
            const active = slotCampaigns.filter((c) => c.active);
            return (
              <Card key={slot.value} title={slot.label}>
                <p className="text-xs text-neutral-400">{slot.description}</p>
                <div className="mt-3 flex items-center gap-2">
                  <Badge tone={active.length > 0 ? "green" : "neutral"}>{active.length} aktiv</Badge>
                  <span className="text-xs text-neutral-400">{slotCampaigns.length} gesamt</span>
                </div>
                <ul className="mt-3 space-y-1">
                  {active.map((c) => (
                    <li key={c.id}>
                      <Link href={`/advertising/campaigns/${c.id}`} className="text-sm text-phoenix-gold-dark hover:underline">
                        {c.name}
                      </Link>
                    </li>
                  ))}
                  {active.length === 0 && <li className="text-sm text-neutral-400">Keine aktive Kampagne</li>}
                </ul>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
