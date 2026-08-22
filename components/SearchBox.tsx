"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { searchTypeLabel } from "@/lib/presentation";
import type { SearchResult } from "@/lib/types";

export default function SearchBox() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

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
      setLoading(false);
      setActiveIndex(-1);
      return;
    }

    setLoading(true);
    setError(false);
    setActiveIndex(-1);
    const controller = new AbortController();
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        if (!res.ok) {
          setError(true);
          setResults(null);
          return;
        }
        const data = await res.json();
        const rawResults = Array.isArray(data) ? data : data?.results;
        setResults(
          Array.isArray(rawResults)
            ? rawResults.filter(
                (item): item is SearchResult =>
                  item && typeof item.id !== "undefined" && typeof item.label === "string" && typeof item.url === "string",
              )
            : [],
        );
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setError(true);
        setResults(null);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(handle);
      controller.abort();
    };
  }, [query]);

  const grouped = (results ?? []).reduce<Record<string, SearchResult[]>>((acc, r) => {
    (acc[r.type] ??= []).push(r);
    return acc;
  }, {});
  const flatResults = useMemo(() => Object.values(grouped).flat(), [grouped]);

  function selectResult(item: SearchResult) {
    setOpen(false);
    setQuery("");
    router.push(item.url);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      event.currentTarget.blur();
      return;
    }
    if (!flatResults.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => (index + 1) % flatResults.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => (index <= 0 ? flatResults.length - 1 : index - 1));
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      selectResult(flatResults[activeIndex]);
    }
  }

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
          onKeyDown={onKeyDown}
          placeholder="Ligen, Teams, Spiele, Modelle suchen …"
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
                  {searchTypeLabel(type)}
                </p>
                <ul className="pb-1">
                  {items.map((item) => {
                    const index = flatResults.indexOf(item);
                    return (
                    <li key={`${item.type}-${item.id}`}>
                      <Link
                        href={item.url}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => {
                          setOpen(false);
                          setQuery("");
                        }}
                        className={`block px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50 ${activeIndex === index ? "bg-neutral-50" : ""}`}
                      >
                        {item.label}
                      </Link>
                    </li>
                    );
                  })}
                </ul>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
