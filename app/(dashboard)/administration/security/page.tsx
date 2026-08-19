import { Suspense } from "react";
import SecurityClient from "@/components/SecurityClient";

export default function SecurityPage() {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-400">Wird geladen…</p>}>
      <SecurityClient />
    </Suspense>
  );
}
