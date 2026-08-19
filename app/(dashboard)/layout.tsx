import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { backendFetch, safeJson } from "@/lib/backend";
import { SESSION_COOKIE_NAME } from "@/lib/session";
import type { Employee } from "@/lib/types";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    redirect("/login");
  }

  let employee: Employee | null = null;
  try {
    const res = await backendFetch("/auth/me", { token });
    if (res.status === 401) {
      redirect("/login");
    }
    if (res.ok) {
      employee = await safeJson<Employee>(res);
    }
  } catch {
    // Backend unreachable: fall through and render a degraded shell rather
    // than bouncing the employee to /login on a transient outage.
  }

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        {employee ? (
          <TopBar employee={employee} />
        ) : (
          <header className="flex h-14 shrink-0 items-center border-b border-neutral-200 bg-white px-4 text-sm text-red-500">
            PHÖNIX Backend nicht erreichbar — Profil konnte nicht geladen werden.
          </header>
        )}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
