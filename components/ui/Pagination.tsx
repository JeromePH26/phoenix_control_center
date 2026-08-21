import Button from "./Button";

/**
 * Section 2 (Priorität 1): gemeinsame Pagination-Komponente. Mehrere Seiten
 * (Teams, künftig weitere) hatten dasselbe Offset/Limit/Total-Muster als
 * lokal duplizierten Code - hier einmal zentral.
 */
export default function Pagination({
  offset,
  limit,
  count,
  total,
  onOffsetChange,
}: {
  offset: number;
  limit: number;
  count: number;
  total: number | null;
  onOffsetChange: (nextOffset: number) => void;
}) {
  if (count === 0) return null;
  return (
    <div className="mt-3 flex items-center justify-between text-xs text-neutral-400">
      <span>{total != null ? `${offset + 1}–${offset + count} von ${total}` : `${count} Einträge`}</span>
      <div className="flex gap-2">
        <Button variant="secondary" disabled={offset === 0} onClick={() => onOffsetChange(Math.max(0, offset - limit))}>
          Zurück
        </Button>
        <Button variant="secondary" disabled={count < limit} onClick={() => onOffsetChange(offset + limit)}>
          Weiter
        </Button>
      </div>
    </div>
  );
}
