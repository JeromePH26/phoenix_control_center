"use client";

import { useCallback, useEffect, useState } from "react";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import InfoTooltip from "@/components/ui/InfoTooltip";
import StateMessage from "@/components/ui/StateMessage";
import AssetGallery from "@/components/AssetGallery";
import UploadAssetModal from "@/components/UploadAssetModal";
import type { FootballAsset } from "@/lib/types";

type LoadState = "loading" | "loaded" | "unreachable" | "error";
type StatusFilter = "" | "MISSING" | "OK" | "STALE";
type TypeFilter = "" | "team" | "league";

function statusTone(status: string): "green" | "red" | "gold" | "neutral" {
  if (status === "OK") return "green";
  if (status === "MISSING") return "red";
  if (status === "STALE") return "gold";
  return "neutral";
}

const ASSET_STATUS_LABEL: Record<string, string> = {
  OK: "Vorhanden",
  MISSING: "Fehlt",
  STALE: "Veraltet",
};
function assetStatusLabel(status: string): string {
  return ASSET_STATUS_LABEL[status] ?? status;
}
const ASSET_TYPE_LABEL: Record<string, string> = { team: "Team", league: "Liga" };
function assetTypeLabel(type: string): string {
  return ASSET_TYPE_LABEL[type] ?? type;
}

const inputClass =
  "rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-900 focus:border-phoenix-gold focus:outline-none focus:ring-1 focus:ring-phoenix-gold";

export default function FootballAssetsClient() {
  const [assets, setAssets] = useState<FootballAsset[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("");
  const [uploadTarget, setUploadTarget] = useState<FootballAsset | null>(null);
  const [imgVersion, setImgVersion] = useState(0);

  const load = useCallback(async () => {
    setState("loading");
    const qs = new URLSearchParams();
    if (statusFilter) qs.set("status", statusFilter);
    try {
      const res = await fetch(`/api/football/assets?${qs.toString()}`);
      if (res.status === 502) {
        setState("unreachable");
        return;
      }
      if (!res.ok) {
        setState("error");
        return;
      }
      const data = await res.json().catch(() => null);
      setAssets(Array.isArray(data) ? data : (data?.assets ?? []));
      setState("loaded");
    } catch {
      setState("unreachable");
    }
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const visible = typeFilter ? assets.filter((a) => a.type === typeFilter) : assets;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-1.5 text-xl font-semibold text-neutral-900">
          Wappen &amp; Assets
          <InfoTooltip text="Assets = Bild-Dateien wie Team- und Liga-Wappen (Logos), die in der App angezeigt werden. Hier siehst du, ob welche fehlen, kannst sie ersetzen und frühere Versionen einsehen." />
        </h1>
        <p className="text-sm text-neutral-400">Team- und Liga-Logos als Galerie, mit Status, Ersetzen und Archiv.</p>
      </div>

      <div className="flex flex-wrap gap-4">
        <div>
          <label htmlFor="statusFilter" className="mb-1 block text-xs font-medium text-neutral-600">
            Status
          </label>
          <select id="statusFilter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)} className={inputClass}>
            <option value="">Alle</option>
            <option value="MISSING">Fehlt</option>
            <option value="OK">Vorhanden</option>
            <option value="STALE">Veraltet</option>
          </select>
        </div>
        <div>
          <label htmlFor="typeFilter" className="mb-1 block text-xs font-medium text-neutral-600">
            Typ
          </label>
          <select id="typeFilter" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as TypeFilter)} className={inputClass}>
            <option value="">Alle</option>
            <option value="team">Team</option>
            <option value="league">Liga</option>
          </select>
        </div>
      </div>

      {state === "loading" && <p className="py-8 text-center text-sm text-neutral-400">Wird geladen…</p>}
      {state === "unreachable" && (
        <StateMessage title="PHÖNIX Backend nicht erreichbar" description="Die Verbindung zum Backend konnte nicht hergestellt werden." />
      )}
      {state === "error" && <StateMessage title="Assets konnten nicht geladen werden" description="Ein unerwarteter Fehler ist aufgetreten." />}
      {state === "loaded" && visible.length === 0 && (
        <p className="py-8 text-center text-sm text-neutral-400">Keine Assets gefunden</p>
      )}

      {state === "loaded" && visible.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((a) => (
            <Card key={`${a.type}-${a.id}`}>
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-neutral-900">{a.entityName ?? a.id}</p>
                  <p className="text-xs text-neutral-400">
                    {assetTypeLabel(a.type)} · {a.id}
                  </p>
                </div>
                <Badge tone={statusTone(a.status)}>{assetStatusLabel(a.status)}</Badge>
              </div>
              <AssetGallery
                type={a.type}
                id={a.id}
                imageSrc={`/api/football/assets/image?type=${encodeURIComponent(a.type)}&id=${encodeURIComponent(a.id)}&v=${imgVersion}`}
                entityName={a.entityName ?? a.id}
                onReplace={() => setUploadTarget(a)}
              />
              {a.updatedAt && <p className="mt-2 text-xs text-neutral-400">Aktualisiert: {String(a.updatedAt)}</p>}
            </Card>
          ))}
        </div>
      )}

      {uploadTarget && (
        <UploadAssetModal
          asset={uploadTarget}
          onClose={() => setUploadTarget(null)}
          onUploaded={() => {
            setUploadTarget(null);
            setImgVersion((v) => v + 1);
            load();
          }}
        />
      )}
    </div>
  );
}
