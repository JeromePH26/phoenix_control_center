import { Suspense } from "react";
import CampaignsListClient from "@/components/CampaignsListClient";

export default function CampaignsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-400">Wird geladen…</p>}>
      <CampaignsListClient />
    </Suspense>
  );
}
