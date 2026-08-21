"use client";

import { useEffect, useRef, useState } from "react";

export interface AutocompleteOption {
  id: string;
  label: string;
  sublabel?: string;
  logoUrl?: string | null;
}

/**
 * Section 6: "Liga- und Team-Suche mit Namen, Wappen und
 * Autovervollständigung statt nur IDs" - ein Textfeld, das per Namen sucht
 * und eine Vorschlagsliste mit Wappen zeigt, statt dass Admins die interne
 * Liga-/Team-ID auswendig kennen oder eintippen müssen.
 */
export default function EntityAutocomplete({
  id,
  label,
  placeholder,
  selectedLabel,
  onSearch,
  onSelect,
  onClear,
}: {
  id: string;
  label: string;
  placeholder?: string;
  /** Anzeigename der aktuell ausgewählten Entität, falls vorhanden - zeigt ein "x" zum Zurücksetzen statt des Suchfelds. */
  selectedLabel?: string | null;
  onSearch: (query: string) => Promise<AutocompleteOption[]>;
  onSelect: (option: AutocompleteOption) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<AutocompleteOption[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function handleChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 2) {
      setOptions([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const results = await onSearch(value.trim());
      setOptions(results);
      setOpen(true);
    }, 250);
  }

  const inputClass =
    "rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-900 focus:border-phoenix-gold focus:outline-none focus:ring-1 focus:ring-phoenix-gold";

  return (
    <div ref={containerRef} className="relative">
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-neutral-600">
        {label}
      </label>
      {selectedLabel ? (
        <div className={`flex items-center justify-between gap-2 ${inputClass} w-48`}>
          <span className="truncate">{selectedLabel}</span>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              onClear();
            }}
            aria-label={`${label} zurücksetzen`}
            className="text-neutral-400 hover:text-neutral-700"
          >
            ×
          </button>
        </div>
      ) : (
        <input
          id={id}
          value={query}
          placeholder={placeholder}
          className={`${inputClass} w-48`}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => options.length > 0 && setOpen(true)}
          autoComplete="off"
        />
      )}
      {open && options.length > 0 && (
        <div className="absolute z-20 mt-1 w-64 rounded-md border border-neutral-200 bg-white py-1 shadow-lg">
          {options.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => {
                onSelect(o);
                setQuery("");
                setOptions([]);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-neutral-50"
            >
              {o.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={o.logoUrl} alt="" className="h-4 w-4 flex-shrink-0 object-contain" />
              ) : (
                <span className="h-4 w-4 flex-shrink-0" />
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-neutral-900">{o.label}</span>
                {o.sublabel && <span className="block truncate text-xs text-neutral-400">{o.sublabel}</span>}
              </span>
            </button>
          ))}
        </div>
      )}
      {open && options.length === 0 && query.trim().length >= 2 && (
        <div className="absolute z-20 mt-1 w-64 rounded-md border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-400 shadow-lg">
          Keine Treffer
        </div>
      )}
    </div>
  );
}
