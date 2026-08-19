import { Suspense } from "react";
import FootballSettlementClient from "@/components/FootballSettlementClient";

export default function FootballSettlementPage() {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-400">Wird geladen…</p>}>
      <FootballSettlementClient />
    </Suspense>
  );
}
