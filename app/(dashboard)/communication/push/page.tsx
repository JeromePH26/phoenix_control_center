import { Suspense } from "react";
import PushCenterClient from "@/components/PushCenterClient";

export default function PushCenterPage() {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-400">Wird geladen…</p>}>
      <PushCenterClient />
    </Suspense>
  );
}
