/**
 * Section 2 (Priorität 1): "LastUpdated-Anzeige" als gemeinsame Komponente.
 * Immer explizit in der Europe/Berlin-Zeitzone formatiert, unabhängig von
 * der Browser-Zeitzone des jeweiligen Admins.
 */
export default function LastUpdated({ iso }: { iso: string | null | undefined }) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const datePart = date.toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" });
  const timePart = date.toLocaleTimeString("de-DE", { timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit" });
  return (
    <span className="text-xs text-neutral-400">
      Zuletzt aktualisiert: {datePart} · {timePart} Uhr
    </span>
  );
}
