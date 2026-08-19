import { Suspense } from "react";
import IncidentsClient from "@/components/IncidentsClient";

export default function IncidentsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-400">Wird geladen…</p>}>
      <IncidentsClient />
    </Suspense>
  );
}
