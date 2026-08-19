import { Suspense } from "react";
import ReleaseCenterClient from "@/components/ReleaseCenterClient";

export default function ReleaseCenterPage() {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-400">Wird geladen…</p>}>
      <ReleaseCenterClient />
    </Suspense>
  );
}
