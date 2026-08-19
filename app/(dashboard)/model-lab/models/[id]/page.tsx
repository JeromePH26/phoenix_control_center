import { Suspense } from "react";
import ModelDetailClient from "@/components/ModelDetailClient";

export default function ModelDetailPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-400">Wird geladen…</p>}>
      <ModelDetailClient id={params.id} />
    </Suspense>
  );
}
