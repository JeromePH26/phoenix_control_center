import { Suspense } from "react";
import FootballTeamsClient from "@/components/FootballTeamsClient";

export default function FootballTeamsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-400">Wird geladen…</p>}>
      <FootballTeamsClient />
    </Suspense>
  );
}
