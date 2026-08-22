"use client";

import { useEffect, useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import InfoTooltip from "@/components/ui/InfoTooltip";
import KeyValueList from "@/components/ui/KeyValueList";
import Modal from "@/components/ui/Modal";
import ArticleHistoryPanel from "@/components/ArticleHistoryPanel";
import { roleLabel, EMPLOYEE_ROLES, type Employee, type PermissionsCatalog } from "@/lib/types";

const AREA_LABEL: Record<string, string> = {
  employees: "Mitarbeiter",
  audit: "Audit Log",
  search: "Suche",
  overview: "Übersicht",
  apiUsage: "API-Nutzung",
  jobs: "Jobs",
  appControl: "App-Steuerung",
  devices: "Geräte",
  support: "Support-Tickets",
  news: "News",
  faq: "FAQ",
  advertising: "Werbung",
  push: "Push-Nachrichten",
  premium: "Premium-Funktionen",
  users: "Nutzer",
  refunds: "Erstattungen",
  ipBlocks: "IP-Sperren",
  featureFlags: "Feature Flags",
  release: "Release Center",
  incidents: "Incidents",
  security: "Security",
  systemHealth: "System Health",
};
const ACTION_LABEL: Record<string, string> = { view: "ansehen", manage: "bearbeiten" };
function permissionLabel(permission: string): string {
  const [area, action] = permission.split(".");
  const areaLabel = AREA_LABEL[area] ?? area;
  const actionLabel = ACTION_LABEL[action] ?? action ?? "";
  return actionLabel ? `${areaLabel} ${actionLabel}` : `${areaLabel} ${action}`;
}

function formatDateTime(value: unknown): string {
  if (value === null || value === undefined || value === "") return "–";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return `${date.toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" })} · ${date.toLocaleTimeString("de-DE", {
    timeZone: "Europe/Berlin",
    hour: "2-digit",
    minute: "2-digit",
  })} Uhr`;
}

// Section 30 (AN2): "Effektive Rechte" - dieselbe Logik wie Backend
// hasPermissionForRole() (permissions.dart): OWNER = immer alles, sonst
// expliziter Override (true/false) sticht, sonst Rollen-Standard.
function isEffectivelyGranted(role: string, permission: string, overrides: Record<string, unknown>, roleDefaults: string[]): boolean {
  if (role === "OWNER") return true;
  const override = overrides[permission];
  if (typeof override === "boolean") return override;
  return roleDefaults.includes(permission);
}

export default function EmployeeDetailModal({
  employee,
  onClose,
  onUpdated,
}: {
  employee: Employee;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [catalog, setCatalog] = useState<PermissionsCatalog | null>(null);
  const [overrides, setOverrides] = useState<Record<string, boolean>>(
    (employee.permissionOverrides as Record<string, boolean> | null) ?? {}
  );
  const [role, setRole] = useState(employee.role);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAllPermissions, setShowAllPermissions] = useState(false);

  useEffect(() => {
    fetch("/api/permissions/catalog")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setCatalog(data))
      .catch(() => {});
  }, []);

  const roleDefaults = catalog?.roleDefaults[role] ?? [];

  function toggle(permission: string) {
    const current = isEffectivelyGranted(role, permission, overrides, roleDefaults);
    const next = !current;
    setOverrides((prev) => {
      const copy = { ...prev };
      if (next === roleDefaults.includes(permission)) {
        // Entspricht wieder dem Rollen-Standard - Override nicht mehr nötig.
        delete copy[permission];
      } else {
        copy[permission] = next;
      }
      return copy;
    });
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/employees/${employee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, permissionOverrides: overrides }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? `Fehler (Status ${res.status}).`);
        return;
      }
      onUpdated();
    } catch {
      setError("Verbindung zum Backend fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  }

  const permissionsByArea = new Map<string, string[]>();
  for (const p of catalog?.allPermissions ?? []) {
    const area = p.split(".")[0];
    permissionsByArea.set(area, [...(permissionsByArea.get(area) ?? []), p]);
  }
  const overrideCount = Object.keys(overrides).length;

  return (
    <Modal title={employee.name} onClose={onClose}>
      <div className="space-y-4">
        <KeyValueList
          data={{
            Login: employee.login,
            "E-Mail": employee.email,
            Abteilung: employee.department || null,
            Status: employee.status,
            "Aktive Sessions": employee.activeSessionCount,
            "Letzte Aktivität": formatDateTime(employee.lastLoginAt),
          }}
        />

        <div>
          <label className="mb-1 flex items-center gap-1 text-xs font-medium text-neutral-600">
            Rolle
            <InfoTooltip text="Legt die Standard-Rechte fest. Individuelle Ausnahmen darunter überschreiben den Rollen-Standard nur für diesen einen Mitarbeiter." />
          </label>
          <select
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-900 focus:border-phoenix-gold focus:outline-none focus:ring-1 focus:ring-phoenix-gold"
            value={role}
            onChange={(e) => setRole(e.target.value as typeof role)}
          >
            {EMPLOYEE_ROLES.map((r) => (
              <option key={r} value={r}>
                {roleLabel(r)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <p className="mb-1 flex items-center gap-1 text-xs font-medium text-neutral-600">
            Effektive Rechte
            <InfoTooltip text="Was dieser Mitarbeiter tatsächlich darf: Rollen-Standard, individuell durch Häkchen an-/abgewählt. OWNER darf immer alles." />
            {overrideCount > 0 && <Badge tone="gold">{overrideCount} Ausnahme(n)</Badge>}
          </p>
          {role === "OWNER" ? (
            <p className="text-sm text-neutral-400">OWNER hat immer alle Rechte — keine Ausnahmen möglich.</p>
          ) : (
            <>
              <button
                type="button"
                className="mb-2 text-xs text-phoenix-gold-dark hover:underline"
                onClick={() => setShowAllPermissions((v) => !v)}
              >
                {showAllPermissions ? "Nur abweichende Rechte zeigen" : "Alle Rechte zeigen"}
              </button>
              <div className="max-h-64 space-y-3 overflow-y-auto rounded-md border border-neutral-100 p-3">
                {Array.from(permissionsByArea.entries()).map(([area, permissions]) => {
                  const visible = showAllPermissions
                    ? permissions
                    : permissions.filter((p) => p in overrides);
                  if (visible.length === 0) return null;
                  return (
                    <div key={area}>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                        {AREA_LABEL[area] ?? area}
                      </p>
                      <div className="space-y-1">
                        {visible.map((p) => {
                          const granted = isEffectivelyGranted(role, p, overrides, roleDefaults);
                          const isOverride = p in overrides;
                          return (
                            <label key={p} className="flex items-center gap-2 text-sm text-neutral-700">
                              <input type="checkbox" checked={granted} onChange={() => toggle(p)} />
                              {permissionLabel(p)}
                              {isOverride && <span className="text-xs text-phoenix-gold-dark">(Ausnahme)</span>}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                {!showAllPermissions && overrideCount === 0 && (
                  <p className="text-sm text-neutral-400">Keine individuellen Ausnahmen — volle Liste über &quot;Alle Rechte zeigen&quot;.</p>
                )}
              </div>
            </>
          )}
        </div>

        {error && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Schließen
          </Button>
          <Button type="button" onClick={save} disabled={saving}>
            {saving ? "…" : "Speichern"}
          </Button>
        </div>

        <div className="border-t border-neutral-100 pt-3">
          <ArticleHistoryPanel area="administration" objectId={employee.id} />
        </div>
      </div>
    </Modal>
  );
}
