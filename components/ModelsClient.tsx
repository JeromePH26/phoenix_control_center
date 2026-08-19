"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import DataTable, { Column } from "@/components/ui/DataTable";
import StateMessage from "@/components/ui/StateMessage";
import type { ModelVersion } from "@/lib/types";

type LoadState = "loading" | "loaded" | "unreachable" | "error";

function statusTone(status: string): "gold" | "neutral" | "red" {
  if (status === "champion") return "gold";
  if (status === "retired") return "red";
  return "neutral";
}

const TITLES: Record<string, { title: string; description: string }> = {
  champion: { title: "Champions", description: "Aktuell aktive Champion-Modelle je Liga × Markt." },
  challenger: { title: "Challenger", description: "Herausforderer-Modelle, die gegen den jeweiligen Champion evaluiert werden." },
  "": { title: "Versionen", description: "Alle Modellversionen (Champion, Challenger, Retired)." },
};

function fmt(value: unknown): string {
  if (value === null || value === undefined || value === "") return "–";
  return String(value);
}

export default function ModelsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = searchParams.get("status") ?? "";

  const [models, setModels] = useState<ModelVersion[]>([]);
  const [state, setState] = useState<LoadState>("loading");

  const load = useCallback(async () => {
    setState("loading");
    try {
      const qs = status ? `?status=${encodeURIComponent(status)}` : "";
      const res = await fetch(`/api/model-lab/models${qs}`);
      if (res.status === 502) {
        setState("unreachable");
        return;
      }
      if (!res.ok) {
        setState("error");
        return;
      }
      const data = await res.json().catch(() => null);
      setModels(Array.isArray(data?.models) ? data.models : []);
      setState("loaded");
    } catch {
      setState("unreachable");
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  const columns: Column<ModelVersion>[] = [
    { header: "Version", cell: (m) => <span className="font-medium text-neutral-900">{m.readable_version}</span> },
    { header: "Liga", cell: (m) => fmt(m.league_id ?? "GLOBAL") },
    { header: "Markt", cell: (m) => fmt(m.market) },
    { header: "Status", cell: (m) => <Badge tone={statusTone(m.status)}>{m.status}</Badge> },
    { header: "Generation", cell: (m) => fmt(m.generation) },
    { header: "Training-Samples", cell: (m) => fmt(m.training_count) },
    { header: "Erstellt", cell: (m) => fmt(m.created_at) },
  ];

  const { title, description } = TITLES[status] ?? {
    title: "Modelle",
    description: `Status: ${status}`,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">{title}</h1>
        <p className="text-sm text-neutral-400">{description}</p>
      </div>

      <Card>
        {state === "loading" && <p className="py-8 text-center text-sm text-neutral-400">Wird geladen…</p>}
        {state === "unreachable" && (
          <StateMessage title="PHÖNIX Backend nicht erreichbar" description="Die Verbindung zum Backend konnte nicht hergestellt werden." />
        )}
        {state === "error" && (
          <StateMessage title="Modelle konnten nicht geladen werden" description="Ein unerwarteter Fehler ist aufgetreten." />
        )}
        {state === "loaded" && (
          <DataTable
            columns={columns}
            rows={models}
            rowKey={(m) => String(m.id)}
            emptyMessage="Keine Modelle gefunden"
            onRowClick={(m) => router.push(`/model-lab/models/${m.id}`)}
          />
        )}
      </Card>
    </div>
  );
}
