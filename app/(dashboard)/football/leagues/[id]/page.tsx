import { Suspense } from "react";
import LeagueDetailClient from "@/components/LeagueDetailClient";

export default function LeagueDetailPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-400">Liga wird geladen…</p>}>
      <LeagueDetailClient leagueId={params.id} />
    </Suspense>
  );
}
