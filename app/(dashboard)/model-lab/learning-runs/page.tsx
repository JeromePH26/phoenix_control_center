import { Suspense } from "react";
import LearningRunsClient from "@/components/LearningRunsClient";

export default function LearningRunsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-400">Wird geladen…</p>}>
      <LearningRunsClient />
    </Suspense>
  );
}
