import { Suspense } from "react";
import NewsListClient from "@/components/NewsListClient";

export default function NewsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-400">Wird geladen…</p>}>
      <NewsListClient />
    </Suspense>
  );
}
