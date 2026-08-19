"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import DataTable, { Column } from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import StateMessage from "@/components/ui/StateMessage";
import type { FeatureFlag } from "@/lib/types";

type LoadState = "loading" | "loaded" | "unreachable" | "error";

const AUDIENCES = ["ALL", "FREE", "PREMIUM", "BETA", "CUSTOM_SEGMENT"];
const STAGES = ["STAGING", "PRODUCTION"];

const inputClass =
  "w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-900 focus:border-phoenix-gold focus:outline-none focus:ring-1 focus:ring-phoenix-gold";
const labelClass = "mb-1 block text-xs font-medium text-neutral-600";
const selectClass =
  "rounded-md border border-neutral-300 px-2 py-1 text-xs text-neutral-900 focus:border-phoenix-gold focus:outline-none focus:ring-1 focus:ring-phoenix-gold";

function fmt(value: unknown): string {
  if (value === null || value === undefined || value === "") return "–";
  return String(value);
}

export default function FeatureFlagsClient() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [state, setState] = useState<LoadState>("loading");

  const [creating, setCreating] = useState(false);
  const [newFlag, setNewFlag] = useState({ flagKey: "", label: "", description: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const res = await fetch("/api/feature-flags");
      if (res.status === 502) {
        setState("unreachable");
        return;
      }
      if (!res.ok) {
        setState("error");
        return;
      }
      const data = await res.json().catch(() => null);
      setFlags(Array.isArray(data?.flags) ? data.flags : []);
      setState("loaded");
    } catch {
      setState("unreachable");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function patchFlag(flagKey: string, patch: Record<string, unknown>) {
    setSavingKey(flagKey);
    try {
      const res = await fetch(`/api/feature-flags/${encodeURIComponent(flagKey)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.flag) {
        setFlags((prev) => prev.map((f) => (f.flag_key === flagKey ? data.flag : f)));
      }
    } finally {
      setSavingKey(null);
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!newFlag.flagKey.trim() || !newFlag.label.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/feature-flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newFlag),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? `Fehler (Status ${res.status}).`);
        return;
      }
      setCreating(false);
      setNewFlag({ flagKey: "", label: "", description: "" });
      load();
    } catch {
      setError("Verbindung zum Backend fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  const columns: Column<FeatureFlag>[] = [
    { header: "Flag", cell: (f) => <span className="font-medium text-neutral-900">{f.label}</span> },
    { header: "Key", cell: (f) => <code className="text-xs text-neutral-500">{f.flag_key}</code> },
    {
      header: "Aktiv",
      cell: (f) => (
        <Button
          variant={f.enabled ? "primary" : "secondary"}
          disabled={savingKey === f.flag_key}
          onClick={() => patchFlag(f.flag_key, { enabled: !f.enabled })}
        >
          {f.enabled ? "An" : "Aus"}
        </Button>
      ),
    },
    {
      header: "Rollout %",
      cell: (f) => (
        <input
          type="number"
          min={0}
          max={100}
          defaultValue={f.rollout_percentage}
          className="w-16 rounded-md border border-neutral-300 px-2 py-1 text-xs"
          onBlur={(e) => {
            const value = Number(e.target.value);
            if (value !== f.rollout_percentage) patchFlag(f.flag_key, { rolloutPercentage: value });
          }}
        />
      ),
    },
    {
      header: "Zielgruppe",
      cell: (f) => (
        <select
          className={selectClass}
          value={f.audience}
          onChange={(e) => patchFlag(f.flag_key, { audience: e.target.value })}
        >
          {AUDIENCES.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      ),
    },
    {
      header: "Stage",
      cell: (f) => (
        <select
          className={selectClass}
          value={f.stage}
          onChange={(e) => patchFlag(f.flag_key, { stage: e.target.value })}
        >
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      ),
    },
    { header: "Geändert", cell: (f) => `${fmt(f.updated_at)} (${fmt(f.updated_by)})` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Feature Flags</h1>
          <p className="text-sm text-neutral-400">
            Feature Flags, Rollout-Prozentsatz und Staging in einem Modell — ein Flag mit stage=STAGING ist sein
            eigener Entwurf.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>Neues Flag</Button>
      </div>

      <Card>
        {state === "loading" && <p className="py-8 text-center text-sm text-neutral-400">Wird geladen…</p>}
        {state === "unreachable" && (
          <StateMessage title="PHÖNIX Backend nicht erreichbar" description="Die Verbindung zum Backend konnte nicht hergestellt werden." />
        )}
        {state === "error" && (
          <StateMessage title="Flags konnten nicht geladen werden" description="Ein unerwarteter Fehler ist aufgetreten." />
        )}
        {state === "loaded" && (
          <DataTable columns={columns} rows={flags} rowKey={(f) => f.flag_key} emptyMessage="Noch keine Feature Flags" />
        )}
      </Card>

      {creating && (
        <Modal title="Neues Feature Flag" onClose={() => setCreating(false)}>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className={labelClass}>Flag-Key (z.B. phoenix_live_v2)</label>
              <input
                className={inputClass}
                value={newFlag.flagKey}
                onChange={(e) => setNewFlag({ ...newFlag, flagKey: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Label</label>
              <input
                className={inputClass}
                value={newFlag.label}
                onChange={(e) => setNewFlag({ ...newFlag, label: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Beschreibung</label>
              <textarea
                rows={2}
                className={inputClass}
                value={newFlag.description}
                onChange={(e) => setNewFlag({ ...newFlag, description: e.target.value })}
              />
            </div>
            {error && (
              <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setCreating(false)}>
                Abbrechen
              </Button>
              <Button type="submit" disabled={busy || !newFlag.flagKey.trim() || !newFlag.label.trim()}>
                {busy ? "…" : "Erstellen"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
