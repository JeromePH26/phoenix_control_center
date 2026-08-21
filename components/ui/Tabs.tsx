"use client";

import { ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export interface TabDef {
  key: string;
  label: ReactNode;
}

/**
 * Tab-Zustand lebt im URL-Query-Parameter `tab`, damit ein Browser-Refresh
 * auf der aktiven Tab-Ansicht bleibt (Section 33: "Browser Refresh auf
 * Liga-Detailseite" muss funktionieren) statt auf die erste Karte
 * zurückzuspringen.
 */
export default function Tabs({
  tabs,
  paramKey = "tab",
  children,
}: {
  tabs: TabDef[];
  paramKey?: string;
  children: (activeKey: string) => ReactNode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const active = searchParams.get(paramKey) ?? tabs[0]?.key ?? "";

  function setActive(key: string) {
    const qs = new URLSearchParams(searchParams.toString());
    if (key === tabs[0]?.key) qs.delete(paramKey);
    else qs.set(paramKey, key);
    const query = qs.toString();
    router.replace(`${window.location.pathname}${query ? `?${query}` : ""}`, { scroll: false });
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1 border-b border-neutral-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActive(t.key)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
              active === t.key
                ? "border-phoenix-gold text-phoenix-gold-dark"
                : "border-transparent text-neutral-500 hover:text-neutral-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {children(active)}
    </div>
  );
}
