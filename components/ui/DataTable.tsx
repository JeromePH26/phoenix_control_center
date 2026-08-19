import { ReactNode } from "react";
import InfoTooltip from "./InfoTooltip";

export interface Column<T> {
  header: string;
  /** Plain-language explanation shown via a hoverable "i" icon next to the header, for jargon/abbreviations. */
  info?: string;
  cell: (row: T) => ReactNode;
  className?: string;
}

export default function DataTable<T>({
  columns,
  rows,
  rowKey,
  emptyMessage = "Keine Daten",
  onRowClick,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500">
            {columns.map((col) => (
              <th key={col.header} className={`py-2 pr-4 font-medium ${col.className ?? ""}`}>
                <span className="inline-flex items-center gap-1">
                  {col.header}
                  {col.info && <InfoTooltip text={col.info} />}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="py-8 text-center text-sm text-neutral-400"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`hover:bg-neutral-50 ${onRowClick ? "cursor-pointer" : ""}`}
              >
                {columns.map((col) => (
                  <td key={col.header} className={`py-2.5 pr-4 align-top text-neutral-800 ${col.className ?? ""}`}>
                    {col.cell(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
