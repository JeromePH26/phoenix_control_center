import { Suspense } from "react";
import SystemAuditClient from "@/components/SystemAuditClient";

export default function SystemAuditReportPage() {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-400">Wird geladen…</p>}>
      <SystemAuditClient />
    </Suspense>
  );
}
