import { Suspense } from "react";
import FootballTipsClient from "@/components/FootballTipsClient";

export default function FootballTipsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-400">Wird geladen…</p>}>
      <FootballTipsClient />
    </Suspense>
  );
}
