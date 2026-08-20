"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import type { FootballAssetHistoryItem } from "@/lib/types";

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "–";
  return `${date.toLocaleDateString("de-DE")} · ${date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr`;
}

export default function AssetGallery({
  type,
  id,
  imageSrc,
  entityName,
  onReplace,
}: {
  type: string;
  id: string;
  imageSrc: string | null;
  entityName: string;
  onReplace: () => void;
}) {
  const [history, setHistory] = useState<FootballAssetHistoryItem[] | null>(null);
  const [showArchive, setShowArchive] = useState(false);

  useEffect(() => {
    setHistory(null);
    setShowArchive(false);
  }, [type, id]);

  function loadHistory() {
    if (history != null) {
      setShowArchive((v) => !v);
      return;
    }
    fetch(`/api/football/assets/${encodeURIComponent(type)}/${encodeURIComponent(id)}/history`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((data: { history?: FootballAssetHistoryItem[] }) => {
        setHistory(Array.isArray(data.history) ? data.history : []);
        setShowArchive(true);
      })
      .catch(() => {
        setHistory([]);
        setShowArchive(true);
      });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-md border border-neutral-100 bg-neutral-50">
          {imageSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageSrc}
              alt={entityName}
              className="h-full w-full object-contain p-1"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <span className="text-xs text-neutral-300">Kein Bild</span>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Button variant="secondary" onClick={onReplace}>
            Bild ersetzen
          </Button>
          <button type="button" onClick={loadHistory} className="text-left text-xs text-neutral-400 hover:text-neutral-600 hover:underline">
            {showArchive ? "Archiv ausblenden" : "Frühere Versionen anzeigen"}
          </button>
        </div>
      </div>

      {showArchive && (
        <div>
          {history == null ? (
            <p className="text-xs text-neutral-400">Wird geladen…</p>
          ) : history.length === 0 ? (
            <p className="text-xs text-neutral-400">Keine früheren Versionen archiviert.</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {history.map((h) => (
                <div key={h.id} className="flex flex-col items-center gap-1">
                  <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-md border border-neutral-100 bg-neutral-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/football/assets/${encodeURIComponent(type)}/${encodeURIComponent(id)}/history/${h.id}/image`}
                      alt={`Archivierte Version vom ${formatDateTime(h.archived_at)}`}
                      className="h-full w-full object-contain p-1"
                    />
                  </div>
                  <span className="text-[10px] text-neutral-400">{formatDateTime(h.archived_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
