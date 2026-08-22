import { NextResponse } from "next/server";
import { backendFetch, safeJson } from "@/lib/backend";
import { backendUnreachableResponse, getSessionToken, isBackendUnreachable } from "@/lib/route-helpers";

// POST /api/security/2fa/setup -> backend POST /api/admin/control-center/auth/2fa/setup
export async function POST() {
  const token = getSessionToken();
  if (!token) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  try {
    const res = await backendFetch("/auth/2fa/setup", { method: "POST", token });
    const data = await safeJson(res);
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    if (isBackendUnreachable(err)) return backendUnreachableResponse();
    throw err;
  }
}
