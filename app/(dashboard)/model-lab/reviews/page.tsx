import { Suspense } from "react";
import ReviewsClient from "@/components/ReviewsClient";

export default function ReviewsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-400">Wird geladen…</p>}>
      <ReviewsClient />
    </Suspense>
  );
}
