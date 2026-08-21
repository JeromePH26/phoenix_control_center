/**
 * Section 1/2 (Priorität 1): einheitliche Ladeanzeige, damit "Wird
 * geladen…" überall gleich aussieht statt als verstreuter Ad-hoc-Text pro
 * Seite. `label` überschreibt den Standardtext (z.B. "Liga wird geladen…").
 */
export default function LoadingState({ label = "Wird geladen…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-neutral-400">
      <svg className="h-4 w-4 animate-spin text-neutral-300" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
      {label}
    </div>
  );
}
