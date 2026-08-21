"use client";

import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";

export default function ConfirmDialog({
  title,
  description,
  confirmLabel = "Bestätigen",
  busy,
  error,
  onConfirm,
  onClose,
  reason,
  onReasonChange,
  reasonRequired,
}: {
  title: string;
  description: string;
  confirmLabel?: string;
  busy?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
  /** Wenn übergeben, zeigt ein Pflicht-Begründungsfeld - für Aktionen, bei denen der Auftrag explizit eine Begründung verlangt (z.B. Section 8: Liga-Statuswechsel). */
  reason?: string;
  onReasonChange?: (value: string) => void;
  reasonRequired?: boolean;
}) {
  const showReason = onReasonChange !== undefined;
  const canConfirm = !busy && (!reasonRequired || (reason ?? "").trim().length > 0);
  return (
    <Modal title={title} onClose={onClose}>
      <p className="text-sm text-neutral-600">{description}</p>
      {showReason && (
        <div className="mt-3">
          <label htmlFor="confirm-dialog-reason" className="mb-1 block text-xs font-medium text-neutral-600">
            Begründung{reasonRequired ? " (erforderlich)" : " (optional)"}
          </label>
          <textarea
            id="confirm-dialog-reason"
            value={reason ?? ""}
            onChange={(e) => onReasonChange?.(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-900 focus:border-phoenix-gold focus:outline-none focus:ring-1 focus:ring-phoenix-gold"
          />
        </div>
      )}
      {error && (
        <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}
      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Abbrechen
        </Button>
        <Button type="button" variant="danger" onClick={onConfirm} disabled={!canConfirm}>
          {busy ? "…" : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
