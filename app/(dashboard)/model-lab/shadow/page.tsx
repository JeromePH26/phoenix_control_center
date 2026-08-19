import { Suspense } from "react";
import ShadowClient from "@/components/ShadowClient";

export default function ShadowPage() {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-400">Wird geladen…</p>}>
      <ShadowClient />
    </Suspense>
  );
}
