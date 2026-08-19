import { Suspense } from "react";
import CampaignDetailClient from "@/components/CampaignDetailClient";

export default function CampaignDetailPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-400">Wird geladen…</p>}>
      <CampaignDetailClient id={params.id} />
    </Suspense>
  );
}
