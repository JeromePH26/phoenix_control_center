"use client";

import { useCallback, useEffect, useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import DataTable, { Column } from "@/components/ui/DataTable";
import InfoTooltip from "@/components/ui/InfoTooltip";
import StateMessage from "@/components/ui/StateMessage";
import UploadAssetModal from "@/components/UploadAssetModal";
import type { FootballAsset } from "@/lib/types";

type LoadState = "loading" | "loaded" | "unreachable" | "error";
type StatusFilter = "" | "MISSING" | "OK" | "STALE";

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

const inputClass =
  "rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-900 focus:border-phoenix-gold focus:outline-none focus:ring-1 focus:ring-phoenix-gold";

export default function FootballAssetsClient() {
  const [assets, setAssets] = useState<FootballAsset[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [uploadTarget, setUploadTarget] = useState<FootballAsset | null>(null);

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

  const columns: Column<FootballAsset>[] = [
    { header: "Typ", info: "Ob es sich um ein Team- oder ein Liga-Wappen (Logo) handelt.", cell: (a) => a.type },
    { header: "Name", cell: (a) => a.entityName ?? a.id },
    { header: "ID", cell: (a) => a.id },
    { header: "Status", cell: (a) => <Badge tone={statusTone(a.status)}>{assetStatusLabel(a.status)}</Badge> },
    { header: "Aktualisiert", cell: (a) => a.updatedAt ?? "–" },
    {
      header: "",
      cell: (a) => (
        <Button variant="secondary" onClick={() => setUploadTarget(a)}>
          Ersetzen
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-1.5 text-xl font-semibold text-neutral-900">
          Wappen &amp; Assets
          <InfoTooltip text="Assets = Bild-Dateien wie Team- und Liga-Wappen (Logos), die in der App angezeigt werden. Hier siehst du, ob welche fehlen, und kannst sie ersetzen." />
        </h1>
        <p className="text-sm text-neutral-400">Team- und Liga-Logos, Status und Ersetzen.</p>
      </div>

      <div>
        <label htmlFor="statusFilter" className="mb-1 block text-xs font-medium text-neutral-600">
          Status
        </label>
        <select
          id="statusFilter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className={inputClass}
        >
          <option value="">Alle</option>
          <option value="MISSING">Fehlt</option>
          <option value="OK">Vorhanden</option>
          <option value="STALE">Veraltet</option>
        </select>
      </div>

      <Card>
        {state === "loading" && <p className="py-8 text-center text-sm text-neutral-400">Wird geladen…</p>}
        {state === "unreachable" && (
          <StateMessage
            title="PHÖNIX Backend nicht erreichbar"
            description="Die Verbindung zum Backend konnte nicht hergestellt werden."
          />
        )}
        {state === "error" && (
          <StateMessage title="Assets konnten nicht geladen werden" description="Ein unerwarteter Fehler ist aufgetreten." />
        )}
        {state === "loaded" && (
          <DataTable
            columns={columns}
            rows={assets}
            rowKey={(a) => `${a.type}-${a.id}`}
            emptyMessage="Keine Assets gefunden"
          />
        )}
      </Card>

      {uploadTarget && (
        <UploadAssetModal
          asset={uploadTarget}
          onClose={() => setUploadTarget(null)}
          onUploaded={() => {
            setUploadTarget(null);
            load();
          }}
        />
      )}
    </div>
  );
}
