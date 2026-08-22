"use client";

import { useCallback, useEffect, useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import InfoTooltip from "@/components/ui/InfoTooltip";
import LoadingState from "@/components/ui/LoadingState";
import NotConfiguredState from "@/components/ui/NotConfiguredState";
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
          minimumOsAndroid: config.minimum_os_android,
          minimumOsIos: config.minimum_os_ios,
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
        <h1 className="flex items-center gap-1.5 text-xl font-semibold text-neutral-900">
          Release Center
          <InfoTooltip text="Verwaltet, welche App-Version aktuell ist und ob ältere Versionen zum Update gezwungen werden." />
        </h1>
        <p className="text-sm text-neutral-400">
          Aktuelle Version und Mindestversion. Kein echtes &quot;Nutzer pro Version&quot;-Tracking — dafür gibt es keine
          App-Telemetrie. Noch nicht von der App ausgelesen.
        </p>
      </div>

      {state === "loading" && <LoadingState />}
      {state === "unreachable" && (
        <StateMessage
          title="PHÖNIX Backend nicht erreichbar"
          description="Die Verbindung zum Backend konnte nicht hergestellt werden."
          onRetry={load}
        />
      )}
      {state === "error" && (
        <StateMessage title="Release-Konfiguration konnte nicht geladen werden" description="Ein unerwarteter Fehler ist aufgetreten." onRetry={load} />
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
                <label className={labelClass}>
                  <span className="inline-flex items-center gap-1">
                    Mindestversion
                    <InfoTooltip text="Nutzer mit einer älteren App-Version als dieser gelten als veraltet (relevant für 'Forced Update')." />
                  </span>
                </label>
                <input
                  className={inputClass}
                  value={config.minimum_supported_version ?? ""}
                  onChange={(e) => setConfig({ ...config, minimum_supported_version: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>
                <span className="inline-flex items-center gap-1">
                  Release Notes / Changelog
                  <InfoTooltip text="Was sich in der aktuellen Version geändert hat - der Text, den Nutzer z.B. im Update-Hinweis sehen könnten." />
                </span>
              </label>
              <textarea
                rows={4}
                className={inputClass}
                value={config.changelog ?? ""}
                onChange={(e) => setConfig({ ...config, changelog: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>
                  <span className="inline-flex items-center gap-1">
                    App-Kompatibilität: Mindest-Android-Version
                    <InfoTooltip text="Welche Android-Version die App mindestens unterstützt, z.B. 'Android 8.0'. Rein informativ, wird noch nicht technisch durchgesetzt." />
                  </span>
                </label>
                <input
                  className={inputClass}
                  placeholder="z.B. Android 8.0"
                  value={config.minimum_os_android ?? ""}
                  onChange={(e) => setConfig({ ...config, minimum_os_android: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>
                  <span className="inline-flex items-center gap-1">
                    App-Kompatibilität: Mindest-iOS-Version
                    <InfoTooltip text="Welche iOS-Version die App mindestens unterstützt, z.B. 'iOS 15'. Rein informativ, wird noch nicht technisch durchgesetzt." />
                  </span>
                </label>
                <input
                  className={inputClass}
                  placeholder="z.B. iOS 15"
                  value={config.minimum_os_ios ?? ""}
                  onChange={(e) => setConfig({ ...config, minimum_os_ios: e.target.value })}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-neutral-600">
              <input
                type="checkbox"
                checked={config.forced_update}
                onChange={(e) => setConfig({ ...config, forced_update: e.target.checked })}
              />
              Forced Update (Nutzer unter Mindestversion müssen aktualisieren, bevor sie die App weiter nutzen können)
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

      {state === "loaded" && (
        <NotConfiguredState
          title="Store/APK-Status"
          reason="Braucht Zugriff auf die App Store Connect API (iOS) und die Google Play Developer API (Android), um den echten Review-/Rollout-Status automatisch abzurufen — noch nicht angebunden."
          requirements={[
            "App Store Connect API-Schlüssel (Apple) hinterlegen",
            "Google Play Developer API-Zugang (Service-Account) einrichten",
            "Admin-Endpunkt bauen, der Review-Status, Rollout-Prozent und Build-/APK-Version aus beiden APIs abfragt",
          ]}
        />
      )}
    </div>
  );
}
