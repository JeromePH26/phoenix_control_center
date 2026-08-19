import { Suspense } from "react";
import SupportTicketsClient from "@/components/SupportTicketsClient";

export default function SupportTicketsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-400">Wird geladen…</p>}>
      <SupportTicketsClient />
    </Suspense>
  );
}
