import { Suspense } from "react";
import ModuleControlClient from "@/components/ModuleControlClient";

export default function ModuleControlPage() {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-400">Wird geladen…</p>}>
      <ModuleControlClient />
    </Suspense>
  );
}
