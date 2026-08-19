import { Suspense } from "react";
import AppControlStatusClient from "@/components/AppControlStatusClient";

export default function AppControlStatusPage() {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-400">Wird geladen…</p>}>
      <AppControlStatusClient />
    </Suspense>
  );
}
