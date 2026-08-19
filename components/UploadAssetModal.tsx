"use client";

import { FormEvent, useState } from "react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import type { FootballAsset } from "@/lib/types";

/**
 * Uploads a replacement image for a team/league asset (logo). The file is
 * sent as multipart/form-data to our own proxy route, which reads it
 * server-side, base64-encodes it, and forwards it to the backend with the
 * legacy admin token attached — the browser never talks to the backend
 * directly and never sees that token.
 */
export default function UploadAssetModal({
  asset,
  onClose,
  onUploaded,
}: {
  asset: FootballAsset;
  onClose: () => void;
  onUploaded: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Bitte eine Datei auswählen.");
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const form = new FormData();
      form.set("file", file);
      const res = await fetch(
        `/api/football/assets/${encodeURIComponent(asset.type)}/${encodeURIComponent(asset.id)}/replace`,
        { method: "POST", body: form }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? `Fehler beim Hochladen (Status ${res.status}).`);
        return;
      }
      onUploaded();
    } catch {
      setError("Verbindung zum Backend fehlgeschlagen.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={`Asset ersetzen: ${asset.entityName ?? asset.id}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <p className="text-sm text-neutral-600">
          {asset.type} · {asset.id} · aktueller Status:{" "}
          <span className="font-medium text-neutral-900">{asset.status}</span>
        </p>
        <div>
          <label htmlFor="asset-file" className="mb-1 block text-xs font-medium text-neutral-600">
            Bilddatei
          </label>
          <input
            id="asset-file"
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-neutral-700 file:mr-3 file:rounded-md file:border file:border-neutral-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-neutral-900 hover:file:bg-neutral-50"
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
          <Button type="submit" disabled={submitting}>
            {submitting ? "Wird hochgeladen…" : "Hochladen"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
