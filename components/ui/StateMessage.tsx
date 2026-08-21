import { ReactNode } from "react";
import Button from "./Button";

/**
 * Section 1/2 (Priorität 1): gemeinsame EmptyState/ErrorState-Komponente.
 * `onRetry`, wenn übergeben, zeigt einen "Erneut laden"-Button - damit ein
 * Fehlerzustand nie eine Sackgasse ist, sondern immer eine konkrete nächste
 * Aktion anbietet.
 */
export default function StateMessage({
  title,
  description,
  icon,
  onRetry,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-neutral-200 px-6 py-12 text-center">
      {icon}
      <p className="text-sm font-medium text-neutral-700">{title}</p>
      {description && (
        <p className="max-w-sm text-sm text-neutral-400">{description}</p>
      )}
      {onRetry && (
        <Button variant="secondary" onClick={onRetry} className="mt-2">
          Erneut laden
        </Button>
      )}
    </div>
  );
}
