import { Suspense } from "react";
import LearningClient from "@/components/LearningClient";

export default function LearningPage() {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-400">Wird geladen…</p>}>
      <LearningClient />
    </Suspense>
  );
}
