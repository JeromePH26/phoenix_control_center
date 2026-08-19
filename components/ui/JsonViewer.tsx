"use client";

export default function JsonViewer({ value, label }: { value: unknown; label: string }) {
  if (value === null || value === undefined) {
    return <span className="text-neutral-300">–</span>;
  }

  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);

  return (
    <details className="group">
      <summary className="cursor-pointer select-none text-xs font-medium text-phoenix-gold-dark hover:underline">
        {label} anzeigen
      </summary>
      <pre className="mt-1 max-w-xs overflow-x-auto rounded-md bg-neutral-50 p-2 text-[11px] leading-snug text-neutral-700">
        {text}
      </pre>
    </details>
  );
}
