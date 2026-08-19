"use client";

import { useCallback, useEffect, useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import StateMessage from "@/components/ui/StateMessage";
import type { ReleaseConfig } from "@/lib/types";

type LoadState = "loading" | "loaded" | "unreachable" | "error";

const inputClass =
  "w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-900 focus:border-phoenix-gold focus:outline-none focus:ring-1 focus:ring-phoenix-gold";
const labelClass = "mb-1 block text-xs font-medium text-neutral-600";

export default function ReleaseCenterClient() {
  const [config, setConfig] = useState<ReleaseConfig | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const res = await fetch("/api/release");
      if (res.status === 502) {
        setState("unreachable");
        return;
      }
      if (!res.ok) {
        setState("error");
        return;
      }
      const data = await res.json().catch(() => null);
      setConfig(data?.release ?? null);
      setState("loaded");
    } catch {
      setState("unreachable");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave() {
    if (!config) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/release", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentVersion: config.current_version,
          minimumSupportedVersion: config.minimum_supported_version,
          forcedUpdate: config.forced_update,
          changelog: config.changelog,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? `Fehler (Status ${res.status}).`);
        return;
      }
      setConfig(data.release);
    } catch {
      setError("Verbindung zum Backend fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Release Center</h1>
        <p className="text-sm text-neutral-400">
          Aktuelle Version und Mindestversion. Kein echtes &quot;Nutzer pro Version&quot;-Tracking — dafür gibt es keine
          App-Telemetrie. Noch nicht von der App ausgelesen.
        </p>
      </div>

      {state === "loading" && <p className="text-sm text-neutral-400">Wird geladen…</p>}
      {state === "unreachable" && (
        <StateMessage title="PHÖNIX Backend nicht erreichbar" description="Die Verbindung zum Backend konnte nicht hergestellt werden." />
      )}
      {state === "error" && (
        <StateMessage title="Release-Konfiguration konnte nicht geladen werden" description="Ein unerwarteter Fehler ist aufgetreten." />
      )}

      {state === "loaded" && config && (
        <Card
          title="Versionskonfiguration"
          action={config.forced_update ? <Badge tone="red">Forced Update aktiv</Badge> : undefined}
        >
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Aktuelle Version</label>
                <input
                  className={inputClass}
                  value={config.current_version ?? ""}
                  onChange={(e) => setConfig({ ...config, current_version: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>Mindestversion</label>
                <input
                  className={inputClass}
                  value={config.minimum_supported_version ?? ""}
                  onChange={(e) => setConfig({ ...config, minimum_supported_version: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Changelog</label>
              <textarea
                rows={4}
                className={inputClass}
                value={config.changelog ?? ""}
                onChange={(e) => setConfig({ ...config, changelog: e.target.value })}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-neutral-600">
              <input
                type="checkbox"
                checked={config.forced_update}
                onChange={(e) => setConfig({ ...config, forced_update: e.target.checked })}
              />
              Forced Update (Nutzer unter Mindestversion müssen aktualisieren)
            </label>
          </div>

          {error && (
            <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="mt-4">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "…" : "Speichern"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
