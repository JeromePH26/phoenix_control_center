import { NextResponse } from "next/server";
import { backendFetch, safeJson } from "@/lib/backend";
import { backendUnreachableResponse, getSessionToken, isBackendUnreachable } from "@/lib/route-helpers";

// GET /api/premium/features -> backend GET /api/admin/control-center/premium/features
export async function GET() {
  const token = getSessionToken();
  if (!token) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }
  try {
    const res = await backendFetch("/premium/features", { token });
    const data = await safeJson(res);
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    if (isBackendUnreachable(err)) return backendUnreachableResponse();
    throw err;
  }
}
