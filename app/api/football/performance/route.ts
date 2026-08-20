import { NextRequest, NextResponse } from "next/server";
import { safeJson } from "@/lib/backend";
import { legacyBackendFetch } from "@/lib/legacyBackend";
import { backendUnreachableResponse, getSessionToken, isBackendUnreachable } from "@/lib/route-helpers";

// GET /api/football/performance?<filters> -> backend GET /api/admin/football/performance/aggregate?<filters>
export async function GET(req: NextRequest) {
  if (!getSessionToken()) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  try {
    const res = await legacyBackendFetch(`/football/performance/aggregate${req.nextUrl.search}`);
    const data = await safeJson(res);
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    if (isBackendUnreachable(err)) return backendUnreachableResponse();
    throw err;
  }
}
