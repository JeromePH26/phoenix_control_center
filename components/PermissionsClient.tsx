"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import Badge from "@/components/ui/Badge";
import InfoTooltip from "@/components/ui/InfoTooltip";
import LoadingState from "@/components/ui/LoadingState";
import StateMessage from "@/components/ui/StateMessage";
import { roleLabel, type PermissionsCatalog } from "@/lib/types";

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
const ACTION_LABEL: Record<string, string> = {
  view: "ansehen",
  manage: "bearbeiten",
};
function permissionLabel(permission: string): string {
  const [area, action] = permission.split(".");
  const areaLabel = AREA_LABEL[area] ?? area;
  const actionLabel = ACTION_LABEL[action] ?? action ?? "";
  return actionLabel ? `${areaLabel} ${actionLabel}` : areaLabel;
}

const inputClass =
  "rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-900 focus:border-phoenix-gold focus:outline-none focus:ring-1 focus:ring-phoenix-gold";

export default function PermissionsClient() {
  const [catalog, setCatalog] = useState<PermissionsCatalog | null>(null);
  const [state, setState] = useState<"loading" | "loaded" | "error" | "unreachable">("loading");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const load = useCallback(async () => {
    setState("loading");
    try {
      const res = await fetch("/api/permissions/catalog");
      if (res.status === 502) {
        setState("unreachable");
        return;
      }
      if (!res.ok) {
        setState("error");
        return;
      }
      setCatalog(await res.json().catch(() => null));
      setState("loaded");
    } catch {
      setState("unreachable");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visibleRoles = useMemo(() => {
    if (!catalog) return [];
    return roleFilter ? catalog.roles.filter((r) => r === roleFilter) : catalog.roles;
  }, [catalog, roleFilter]);

  const groups = useMemo(() => {
    if (!catalog) return [];
    const query = search.trim().toLowerCase();
    const byArea = new Map<string, string[]>();
    for (const permission of catalog.allPermissions) {
      if (query && !permissionLabel(permission).toLowerCase().includes(query) && !permission.toLowerCase().includes(query)) {
        continue;
      }
      const area = permission.split(".")[0];
      byArea.set(area, [...(byArea.get(area) ?? []), permission]);
    }
    return Array.from(byArea.entries()).sort(([a], [b]) => (AREA_LABEL[a] ?? a).localeCompare(AREA_LABEL[b] ?? b));
  }, [catalog, search]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-1.5 text-xl font-semibold text-neutral-900">
          Rechte
          <InfoTooltip text="Übersicht, welche Rolle standardmäßig was darf. Ein Häkchen bedeutet: Mitarbeiter mit dieser Rolle dürfen das." />
        </h1>
        <p className="text-sm text-neutral-400">
          Standard-Berechtigungen je Rolle, nach Bereich gruppiert. OWNER hat immer alle Rechte. Individuelle
          Ausnahmen für einzelne Mitarbeiter (Least-Privilege: nur wo wirklich nötig) werden in der{" "}
          <Link href="/administration/employees" className="text-phoenix-gold-dark hover:underline">
            Mitarbeiterverwaltung
          </Link>{" "}
          gesetzt — dort auch die effektiven Rechte pro Person.
        </p>
      </div>

      {state === "loading" && <LoadingState />}
      {state === "unreachable" && (
        <StateMessage title="PHÖNIX Backend nicht erreichbar" description="Die Verbindung zum Backend konnte nicht hergestellt werden." onRetry={load} />
      )}
      {state === "error" && (
        <StateMessage title="Rechte-Matrix konnte nicht geladen werden" description="Ein unerwarteter Fehler ist aufgetreten." onRetry={load} />
      )}

      {state === "loaded" && catalog && (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="permission-search" className="mb-1 block text-xs font-medium text-neutral-600">
                Suche
              </label>
              <input
                id="permission-search"
                className={inputClass}
                placeholder="z.B. Push, Tickets, security.manage…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="role-filter" className="mb-1 block text-xs font-medium text-neutral-600">
                Rolle
              </label>
              <select id="role-filter" className={inputClass} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                <option value="">Alle Rollen</option>
                {catalog.roles.map((r) => (
                  <option key={r} value={r}>
                    {roleLabel(r)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {groups.length === 0 && <p className="text-sm text-neutral-400">Keine passenden Rechte gefunden.</p>}

          <div className="space-y-6">
            {groups.map(([area, permissions]) => (
              <div key={area} className="overflow-x-auto rounded-lg border border-neutral-200 bg-white shadow-sm">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500">
                      <th className="px-4 py-2 font-medium">{AREA_LABEL[area] ?? area}</th>
                      {visibleRoles.map((role) => (
                        <th key={role} className="px-4 py-2 font-medium">
                          {roleLabel(role)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {permissions.map((permission) => (
                      <tr key={permission}>
                        <td className="px-4 py-2 text-neutral-700">
                          {permissionLabel(permission)}
                          <span className="ml-1.5 font-mono text-[10px] text-neutral-400">({permission})</span>
                        </td>
                        {visibleRoles.map((role) => {
                          const granted = role === "OWNER" || (catalog.roleDefaults[role] ?? []).includes(permission);
                          return (
                            <td key={role} className="px-4 py-2">
                              <Badge tone={granted ? "green" : "neutral"}>{granted ? "✓" : "–"}</Badge>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
