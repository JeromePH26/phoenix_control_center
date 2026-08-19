import { NextRequest, NextResponse } from "next/server";
import { safeJson } from "@/lib/backend";
import { legacyBackendFetch } from "@/lib/legacyBackend";
import { backendUnreachableResponse, getSessionToken, isBackendUnreachable } from "@/lib/route-helpers";

// GET /api/model-lab/models?status= -> backend GET /api/admin/model-lab/models?status=
export async function GET(req: NextRequest) {
  if (!getSessionToken()) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const qs = req.nextUrl.searchParams.toString();

  try {
    const res = await legacyBackendFetch(`/model-lab/models${qs ? `?${qs}` : ""}`);
    const data = await safeJson(res);
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    if (isBackendUnreachable(err)) return backendUnreachableResponse();
    throw err;
  }
}
