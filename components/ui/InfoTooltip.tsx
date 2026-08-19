"use client";

import { useState } from "react";

/**
 * Small "ⓘ" icon shown next to a technical term. Hover or keyboard-focus
 * reveals a plain-language explanation. Use next to any jargon a
 * non-technical employee might not know (abbreviations, metrics, internal
 * concepts) - not next to every label.
 */
export default function InfoTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(e) => {
          e.preventDefault();
          setOpen((v) => !v);
        }}
        aria-label={`Erklärung: ${text}`}
        className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-neutral-300 text-[10px] font-semibold leading-none text-neutral-500 hover:border-phoenix-gold hover:text-phoenix-gold-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-phoenix-gold"
      >
        i
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute bottom-full left-1/2 z-50 mb-1.5 w-60 -translate-x-1/2 rounded-md border border-neutral-700 bg-neutral-900 px-2.5 py-1.5 text-xs font-normal leading-snug text-white shadow-lg"
        >
          {text}
          <span className="absolute left-1/2 top-full -mt-px h-2 w-2 -translate-x-1/2 rotate-45 border-b border-r border-neutral-700 bg-neutral-900" />
        </span>
      )}
    </span>
  );
}
