import { Suspense } from "react";
import AuditLogClient from "@/components/AuditLogClient";

export default function AuditLogPage() {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-400">Wird geladen…</p>}>
      <AuditLogClient />
    </Suspense>
  );
}
