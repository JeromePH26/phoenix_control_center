import { NextResponse } from "next/server";
import { backendFetch, safeJson } from "@/lib/backend";
import { backendUnreachableResponse, getSessionToken, isBackendUnreachable } from "@/lib/route-helpers";

// GET /api/support/assignable-employees -> backend GET /api/admin/control-center/support/assignable-employees
// Minimal {id, name} list for ticket-assignment dropdowns - available to
// support.view (unlike the full /api/employees list, which requires
// employees.view and SUPPORT doesn't have by default).
export async function GET() {
  const token = getSessionToken();
  if (!token) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  try {
    const res = await backendFetch("/support/assignable-employees", { token });
    const data = await safeJson(res);
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    if (isBackendUnreachable(err)) return backendUnreachableResponse();
    throw err;
  }
}
