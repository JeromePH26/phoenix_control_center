import { Suspense } from "react";
import FootballMatchesClient from "@/components/FootballMatchesClient";

export default function FootballMatchesPage() {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-400">Wird geladen…</p>}>
      <FootballMatchesClient />
    </Suspense>
  );
}
