"use client";

import { useEffect, useState } from "react";

/**
 * Section 20 (AN2): "Autor" - Mitarbeiter-IDs sind für niemanden lesbar,
 * jede Stelle, die einen Autor zeigt, muss den Namen zeigen. Gleiches
 * Cache-Muster wie useLeagueNames.ts, wiederverwendet den bestehenden
 * /api/support/assignable-employees-Endpunkt statt einen neuen zu bauen.
 */

let cache: Record<string, string> | null = null;
let inFlight: Promise<Record<string, string>> | null = null;

async function loadEmployeeNames(): Promise<Record<string, string>> {
  if (cache) return cache;
  if (!inFlight) {
    inFlight = fetch("/api/support/assignable-employees")
      .then((res) => (res.ok ? res.json() : { employees: [] }))
      .then((data) => {
        const employees: Array<{ id?: number; name?: string }> = Array.isArray(data?.employees) ? data.employees : [];
        const map: Record<string, string> = {};
        for (const e of employees) {
          if (e.id != null && e.name) map[String(e.id)] = e.name;
        }
        cache = map;
        return map;
      })
      .catch(() => ({}) as Record<string, string>);
  }
  return inFlight;
}

export function useEmployeeNames(): {
  employeeName: (employeeId: number | string | null | undefined) => string;
  loaded: boolean;
} {
  const [names, setNames] = useState<Record<string, string> | null>(cache);

  useEffect(() => {
    if (cache) return;
    let cancelled = false;
    loadEmployeeNames().then((map) => {
      if (!cancelled) setNames(map);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function employeeName(employeeId: number | string | null | undefined): string {
    if (employeeId == null) return "–";
    if (!names) return `Mitarbeiter #${employeeId}`;
    return names[String(employeeId)] ?? `Mitarbeiter #${employeeId}`;
  }

  return { employeeName, loaded: names !== null };
}
