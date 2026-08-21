import { Suspense } from "react";
import TeamDetailClient from "@/components/TeamDetailClient";

export default function TeamDetailPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-400">Team wird geladen…</p>}>
      <TeamDetailClient teamId={params.id} />
    </Suspense>
  );
}
