import { Suspense } from "react";
import SupportTicketDetailClient from "@/components/SupportTicketDetailClient";

export default function SupportTicketDetailPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-400">Wird geladen…</p>}>
      <SupportTicketDetailClient id={params.id} />
    </Suspense>
  );
}
