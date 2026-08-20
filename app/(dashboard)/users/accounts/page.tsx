import { Suspense } from "react";
import UsersAccountsClient from "@/components/UsersAccountsClient";

export default function UsersAccountsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-400">Wird geladen…</p>}>
      <UsersAccountsClient />
    </Suspense>
  );
}
