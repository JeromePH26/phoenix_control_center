"use client";

import { FormEvent, useState } from "react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";

/**
 * Confirmation dialog for changing one of a match's consequential
 * product-facing flags (visible / analysisEnabled / tipEnabled /
 * learningEnabled / liveEnabled). Requires a reason before submitting, per
 * the "Grund / Kommentar / Audit" product spec. Employee identity isn't
 * available on the legacy admin-token path yet — that's a known gap, we
 * only send reason/comment.
 */
export default function FlagChangeDialog({
  title,
  description,
  confirmLabel = "Bestätigen",
  busy,
  error,
  onConfirm,
  onClose,
}: {
  title: string;
  description: string;
  confirmLabel?: string;
  busy?: boolean;
  error?: string | null;
  onConfirm: (reason: string, comment: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [comment, setComment] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!reason.trim()) return;
    onConfirm(reason.trim(), comment.trim());
  }

  const inputClass =
    "w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-900 focus:border-phoenix-gold focus:outline-none focus:ring-1 focus:ring-phoenix-gold";
  const labelClass = "mb-1 block text-xs font-medium text-neutral-600";

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <p className="text-sm text-neutral-600">{description}</p>
        <div>
          <label htmlFor="flag-reason" className={labelClass}>
            Grund (erforderlich)
          </label>
          <input
            id="flag-reason"
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="flag-comment" className={labelClass}>
            Kommentar (optional)
          </label>
          <textarea
            id="flag-comment"
            rows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className={inputClass}
          />
        </div>

        {error && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Abbrechen
          </Button>
          <Button type="submit" disabled={busy || !reason.trim()}>
            {busy ? "…" : confirmLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
