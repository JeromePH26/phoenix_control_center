import InfoTooltip from "./InfoTooltip";

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "Keine Daten";
  if (Array.isArray(value)) return value.length === 0 ? "Keine Daten" : `${value.length} Einträge`;
  if (typeof value === "object") return "Details vorhanden";
  if (typeof value === "boolean") return value ? "Ja" : "Nein";
  return String(value);
}

function formatKey(key: string): string {
  const spaced = key.replace(/_/g, " ").replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * `info`, if given, is keyed by the exact same key used in `data` and shows
 * a hoverable "i" icon with a plain-language explanation next to that row's
 * label - for jargon/abbreviations only, not every row.
 */
export default function KeyValueList({
  data,
  info,
}: {
  data: Record<string, unknown> | null | undefined;
  info?: Record<string, string>;
}) {
  const entries = data ? Object.entries(data) : [];

  if (entries.length === 0) {
    return <p className="text-sm text-neutral-400">Keine Daten</p>;
  }

  return (
    <dl className="space-y-1.5">
      {entries.map(([key, value]) => (
        <div key={key} className="flex items-baseline justify-between gap-4 text-sm">
          <dt className="flex items-center gap-1 text-neutral-500">
            {formatKey(key)}
            {info?.[key] && <InfoTooltip text={info[key]} />}
          </dt>
          <dd className="font-medium text-neutral-900">{formatValue(value)}</dd>
        </div>
      ))}
    </dl>
  );
}
