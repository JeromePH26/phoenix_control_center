function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "Keine Daten";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function formatKey(key: string): string {
  const spaced = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export default function KeyValueList({ data }: { data: Record<string, unknown> | null | undefined }) {
  const entries = data ? Object.entries(data) : [];

  if (entries.length === 0) {
    return <p className="text-sm text-neutral-400">Keine Daten</p>;
  }

  return (
    <dl className="space-y-1.5">
      {entries.map(([key, value]) => (
        <div key={key} className="flex items-baseline justify-between gap-4 text-sm">
          <dt className="text-neutral-500">{formatKey(key)}</dt>
          <dd className="font-medium text-neutral-900">{formatValue(value)}</dd>
        </div>
      ))}
    </dl>
  );
}
