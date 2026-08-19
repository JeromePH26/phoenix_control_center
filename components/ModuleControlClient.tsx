"use client";

import { useCallback, useEffect, useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import StateMessage from "@/components/ui/StateMessage";
import type { ModuleControl } from "@/lib/types";

type LoadState = "loading" | "loaded" | "unreachable" | "error";

function fmt(value: unknown): string {
  if (value === null || value === undefined || value === "") return "–";
  return String(value);
}

export default function ModuleControlClient() {
  const [modules, setModules] = useState<ModuleControl[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const res = await fetch("/api/app-control/modules");
      if (res.status === 502) {
        setState("unreachable");
        return;
      }
      if (!res.ok) {
        setState("error");
        return;
      }
      const data = await res.json().catch(() => null);
      setModules(Array.isArray(data?.modules) ? data.modules : []);
      setState("loaded");
    } catch {
      setState("unreachable");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggle(module: ModuleControl) {
    setSavingKey(module.module_key);
    try {
      const res = await fetch(`/api/app-control/modules/${encodeURIComponent(module.module_key)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !module.enabled }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.module) {
        setModules((prev) => prev.map((m) => (m.module_key === module.module_key ? data.module : m)));
      }
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Module</h1>
        <p className="text-sm text-neutral-400">
          Pro-Subsystem-Schalter. Bei den mit <Badge tone="green">Verbunden</Badge> markierten Modulen stoppt das
          Abschalten wirklich die Backend-Arbeit (nicht nur die UI). Bei den anderen existiert der Schalter, ist aber
          noch nicht mit Backend-Verhalten verbunden — bewusst so gekennzeichnet statt vorgetäuscht.
        </p>
      </div>

      {state === "loading" && <p className="text-sm text-neutral-400">Wird geladen…</p>}
      {state === "unreachable" && (
        <StateMessage title="PHÖNIX Backend nicht erreichbar" description="Die Verbindung zum Backend konnte nicht hergestellt werden." />
      )}
      {state === "error" && (
        <StateMessage title="Module konnten nicht geladen werden" description="Ein unerwarteter Fehler ist aufgetreten." />
      )}

      {state === "loaded" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {modules.map((m) => (
            <Card
              key={m.module_key}
              title={m.label}
              action={
                <div className="flex gap-1.5">
                  <Badge tone={m.enforced_in_backend ? "green" : "neutral"}>
                    {m.enforced_in_backend ? "Verbunden" : "Nur Schalter"}
                  </Badge>
                  <Badge tone={m.enabled ? "green" : "red"}>{m.enabled ? "An" : "Aus"}</Badge>
                </div>
              }
            >
              <p className="text-sm text-neutral-600">{m.description}</p>
              <p className="mt-2 text-xs text-neutral-400">
                Zuletzt geändert: {fmt(m.updated_at)} {m.updated_by ? `von ${m.updated_by}` : ""}
              </p>
              <div className="mt-3">
                <Button
                  variant={m.enabled ? "danger" : "primary"}
                  disabled={savingKey === m.module_key}
                  onClick={() => toggle(m)}
                >
                  {savingKey === m.module_key ? "…" : m.enabled ? "Deaktivieren" : "Aktivieren"}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
