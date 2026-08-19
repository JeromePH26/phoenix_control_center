import { Suspense } from "react";
import PremiumFeatureMatrixClient from "@/components/PremiumFeatureMatrixClient";

export default function PremiumFeatureMatrixPage() {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-400">Wird geladen…</p>}>
      <PremiumFeatureMatrixClient />
    </Suspense>
  );
}
