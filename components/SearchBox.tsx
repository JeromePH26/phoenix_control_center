"use client";

import { useEffect, useRef, useState } from "react";
import type { SearchResult } from "@/lib/types";

export default function SearchBox() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults(null);
      setError(false);
      return;
    }

    setLoading(true);
    setError(false);
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        if (!res.ok) {
          setError(true);
          setResults(null);
          return;
        }
        const data = await res.json();
        setResults(Array.isArray(data) ? data : []);
      } catch {
        setError(true);
        setResults(null);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(handle);
  }, [query]);

  const grouped = (results ?? []).reduce<Record<string, SearchResult[]>>((acc, r) => {
    (acc[r.type] ??= []).push(r);
    return acc;
  }, {});

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
        >
          <path
            fillRule="evenodd"
            d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
            clipRule="evenodd"
          />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Suche..."
          className="w-full rounded-md border border-neutral-200 bg-neutral-50 py-1.5 pl-8 pr-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-phoenix-gold focus:bg-white focus:outline-none focus:ring-1 focus:ring-phoenix-gold"
        />
      </div>

      {open && query.trim() && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-96 overflow-y-auto rounded-md border border-neutral-200 bg-white shadow-lg">
          {loading && (
            <p className="px-3 py-3 text-sm text-neutral-400">Suche läuft…</p>
          )}
          {!loading && error && (
            <p className="px-3 py-3 text-sm text-red-500">
              Suche momentan nicht verfügbar.
            </p>
          )}
          {!loading && !error && results && results.length === 0 && (
            <p className="px-3 py-3 text-sm text-neutral-400">Keine Treffer.</p>
          )}
          {!loading &&
            !error &&
            Object.entries(grouped).map(([type, items]) => (
              <div key={type} className="border-b border-neutral-100 last:border-0">
                <p className="px-3 pt-2 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
                  {type}
                </p>
                <ul className="pb-1">
                  {items.map((item) => (
                    <li key={`${item.type}-${item.id}`}>
                      <a
                        href={item.url}
                        className="block px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50"
                      >
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
