import { Suspense } from "react";
import FaqClient from "@/components/FaqClient";

export default function FaqPage() {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-400">Wird geladen…</p>}>
      <FaqClient />
    </Suspense>
  );
}
