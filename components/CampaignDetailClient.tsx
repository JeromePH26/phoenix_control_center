"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import InfoTooltip from "@/components/ui/InfoTooltip";
import StateMessage from "@/components/ui/StateMessage";
import type { AdCampaign } from "@/lib/types";

type LoadState = "loading" | "loaded" | "notfound" | "unreachable" | "error";

const SLOTS: { value: string; label: string }[] = [
  { value: "home_banner", label: "Startseite Banner" },
  { value: "match_detail_infeed", label: "Matchdetail In-Feed" },
  { value: "news_infeed", label: "News In-Feed" },
];
const AUDIENCES = ["ALL", "FREE", "PREMIUM"];

const inputClass =
  "w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-900 focus:border-phoenix-gold focus:outline-none focus:ring-1 focus:ring-phoenix-gold";
const labelClass = "mb-1 block text-xs font-medium text-neutral-600";

export default function CampaignDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const isNew = id === "new";

  const [state, setState] = useState<LoadState>(isNew ? "loaded" : "loading");
  const [campaign, setCampaign] = useState<Partial<AdCampaign>>({
    name: "",
    slot: "home_banner",
    image_url: "",
    link_url: "",
    active: true,
    target_audience: "ALL",
    start_date: null,
    end_date: null,
    target_country: null,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (isNew) return;
    setState("loading");
    try {
      const res = await fetch(`/api/advertising/campaigns/${encodeURIComponent(id)}`);
      if (res.status === 404) {
        setState("notfound");
        return;
      }
      if (res.status === 502) {
        setState("unreachable");
        return;
      }
      if (!res.ok) {
        setState("error");
        return;
      }
      const data = await res.json().catch(() => null);
      setCampaign(data?.campaign ?? {});
      setState("loaded");
    } catch {
      setState("unreachable");
    }
  }, [id, isNew]);

  useEffect(() => {
    load();
  }, [load]);

  function field<K extends keyof AdCampaign>(key: K, value: AdCampaign[K]) {
    setCampaign((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const payload = isNew
      ? {
          name: campaign.name,
          slot: campaign.slot,
          imageUrl: campaign.image_url,
          linkUrl: campaign.link_url,
          active: campaign.active,
          targetAudience: campaign.target_audience,
          targetCountry: campaign.target_country || null,
          startDate: campaign.start_date || null,
          endDate: campaign.end_date || null,
        }
      : {
          name: campaign.name,
          imageUrl: campaign.image_url,
          linkUrl: campaign.link_url,
          active: campaign.active,
          targetAudience: campaign.target_audience,
          targetCountry: campaign.target_country || null,
          startDate: campaign.start_date || null,
          endDate: campaign.end_date || null,
        };
    try {
      const res = await fetch(isNew ? "/api/advertising/campaigns" : `/api/advertising/campaigns/${encodeURIComponent(id)}`, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? `Fehler (Status ${res.status}).`);
        return;
      }
      if (isNew) {
        router.push(`/advertising/campaigns/${data.campaign.id}`);
      } else {
        setCampaign(data.campaign);
      }
    } catch {
      setError("Verbindung zum Backend fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  }

  const ctr =
    campaign.impressions && campaign.impressions > 0
      ? (((campaign.clicks ?? 0) / campaign.impressions) * 100).toFixed(2)
      : null;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/advertising/campaigns" className="text-xs text-neutral-400 hover:text-neutral-600">
          ← Zurück zu Kampagnen
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-neutral-900">{isNew ? "Neue Kampagne" : "Kampagne bearbeiten"}</h1>
      </div>

      {state === "loading" && <p className="text-sm text-neutral-400">Wird geladen…</p>}
      {state === "notfound" && <StateMessage title="Kampagne nicht gefunden" description="Für diese ID liegen keine Daten vor." />}
      {state === "unreachable" && (
        <StateMessage title="PHÖNIX Backend nicht erreichbar" description="Die Verbindung zum Backend konnte nicht hergestellt werden." />
      )}
      {state === "error" && (
        <StateMessage title="Kampagne konnte nicht geladen werden" description="Ein unerwarteter Fehler ist aufgetreten." />
      )}

      {state === "loaded" && (
        <>
          {!isNew && (
            <Card title="Statistik">
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-md border border-neutral-100 bg-neutral-50 px-3 py-2.5">
                  <p className="text-xs text-neutral-500">Impressions</p>
                  <p className="mt-0.5 text-xl font-semibold text-neutral-900">{campaign.impressions}</p>
                </div>
                <div className="rounded-md border border-neutral-100 bg-neutral-50 px-3 py-2.5">
                  <p className="text-xs text-neutral-500">Klicks</p>
                  <p className="mt-0.5 text-xl font-semibold text-neutral-900">{campaign.clicks}</p>
                </div>
                <div className="rounded-md border border-neutral-100 bg-neutral-50 px-3 py-2.5">
                  <p className="flex items-center gap-1 text-xs text-neutral-500">
                    CTR
                    <InfoTooltip text="Click-Through-Rate: Anteil der Anzeigen, die zu einem Klick geführt haben. Höher = die Werbung funktioniert besser." />
                  </p>
                  <p className="mt-0.5 text-xl font-semibold text-neutral-900">{ctr ? `${ctr}%` : "–"}</p>
                </div>
              </div>
            </Card>
          )}

          <Card title="Details" action={!isNew ? <Badge tone={campaign.active ? "green" : "neutral"}>{campaign.active ? "Aktiv" : "Pausiert"}</Badge> : undefined}>
            <div className="space-y-3">
              <div>
                <label className={labelClass}>Name</label>
                <input className={inputClass} value={campaign.name ?? ""} onChange={(e) => field("name", e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Slot</label>
                  <select
                    className={inputClass}
                    value={campaign.slot ?? "home_banner"}
                    disabled={!isNew}
                    onChange={(e) => field("slot", e.target.value)}
                  >
                    {SLOTS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Zielgruppe</label>
                  <select className={inputClass} value={campaign.target_audience ?? "ALL"} onChange={(e) => field("target_audience", e.target.value)}>
                    {AUDIENCES.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelClass}>Asset-Bild-URL</label>
                <input className={inputClass} value={campaign.image_url ?? ""} onChange={(e) => field("image_url", e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Ziel-Link</label>
                <input className={inputClass} value={campaign.link_url ?? ""} onChange={(e) => field("link_url", e.target.value)} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>Startdatum</label>
                  <input
                    type="date"
                    className={inputClass}
                    value={campaign.start_date ? campaign.start_date.slice(0, 10) : ""}
                    onChange={(e) => field("start_date", e.target.value || null)}
                  />
                </div>
                <div>
                  <label className={labelClass}>Enddatum</label>
                  <input
                    type="date"
                    className={inputClass}
                    value={campaign.end_date ? campaign.end_date.slice(0, 10) : ""}
                    onChange={(e) => field("end_date", e.target.value || null)}
                  />
                </div>
                <div>
                  <label className={labelClass}>Land (optional)</label>
                  <input className={inputClass} value={campaign.target_country ?? ""} onChange={(e) => field("target_country", e.target.value || null)} />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-neutral-600">
                <input type="checkbox" checked={campaign.active ?? true} onChange={(e) => field("active", e.target.checked)} />
                Aktiv
              </label>
            </div>

            {error && (
              <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}

            <div className="mt-4">
              <Button onClick={handleSave} disabled={saving || !campaign.name?.trim() || !campaign.image_url?.trim() || !campaign.link_url?.trim()}>
                {saving ? "…" : isNew ? "Erstellen" : "Speichern"}
              </Button>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
