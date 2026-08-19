import { Suspense } from "react";
import FeatureFlagsClient from "@/components/FeatureFlagsClient";

export default function FeatureFlagsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-400">Wird geladen…</p>}>
      <FeatureFlagsClient />
    </Suspense>
  );
}
