import { Suspense } from "react";
import LearningRunDetailClient from "@/components/LearningRunDetailClient";

export default function LearningRunDetailPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-400">Wird geladen…</p>}>
      <LearningRunDetailClient id={params.id} />
    </Suspense>
  );
}
