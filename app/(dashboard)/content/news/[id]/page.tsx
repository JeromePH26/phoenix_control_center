import { Suspense } from "react";
import NewsArticleClient from "@/components/NewsArticleClient";

export default function NewsArticlePage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-400">Wird geladen…</p>}>
      <NewsArticleClient id={params.id} />
    </Suspense>
  );
}
