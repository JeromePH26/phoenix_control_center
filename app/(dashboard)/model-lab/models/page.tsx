import { Suspense } from "react";
import ModelsClient from "@/components/ModelsClient";

export default function ModelsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-400">Wird geladen…</p>}>
      <ModelsClient />
    </Suspense>
  );
}
