"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import SearchBox from "@/components/SearchBox";
import type { Employee } from "@/lib/types";
import { roleLabel } from "@/lib/types";

export default function TopBar({ employee }: { employee: Employee }) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/logout", { method: "POST" });
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-neutral-200 bg-white px-4">
      <span className="hidden shrink-0 text-sm font-semibold tracking-wide text-neutral-900 md:block">
        PHÖNIX <span className="text-phoenix-gold">CONTROL CENTER</span>
      </span>

      <div className="flex-1">
        <SearchBox />
      </div>

      <button
        type="button"
        title="Benachrichtigungen (noch nicht angebunden)"
        disabled
        className="relative flex h-8 w-8 shrink-0 cursor-not-allowed items-center justify-center rounded-full text-neutral-300"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
          <path d="M10 2a6 6 0 00-6 6c0 3.09-1.11 4.5-1.7 5.13a.75.75 0 00.55 1.37h14.3a.75.75 0 00.55-1.37C17.11 12.5 16 11.09 16 8a6 6 0 00-6-6z" />
          <path d="M8.2 16.5a1.8 1.8 0 003.6 0h-3.6z" />
        </svg>
      </button>

      <div className="flex shrink-0 items-center gap-3 border-l border-neutral-200 pl-4">
        <div className="text-right leading-tight">
          <p className="text-sm font-medium text-neutral-900">{employee.name}</p>
          <p className="text-xs text-neutral-400">{roleLabel(employee.role)}</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="rounded-md border border-neutral-200 px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 disabled:opacity-50"
        >
          {loggingOut ? "…" : "Abmelden"}
        </button>
      </div>
    </header>
  );
}
