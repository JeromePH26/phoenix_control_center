import { NextRequest, NextResponse } from "next/server";
import { safeJson } from "@/lib/backend";
import { legacyBackendFetch } from "@/lib/legacyBackend";
import { backendUnreachableResponse, getSessionToken, isBackendUnreachable } from "@/lib/route-helpers";

// GET /api/model-lab/learning-runs?limit= -> backend GET /api/admin/model-lab/learning-runs?limit=
export async function GET(req: NextRequest) {
  if (!getSessionToken()) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const qs = req.nextUrl.searchParams.toString();

  try {
    const res = await legacyBackendFetch(`/model-lab/learning-runs${qs ? `?${qs}` : ""}`);
    const data = await safeJson(res);
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    if (isBackendUnreachable(err)) return backendUnreachableResponse();
    throw err;
  }
}

// POST /api/model-lab/learning-runs -> backend POST /api/admin/model-lab/learning-runs/start
// Same business logic as the scheduled Tuesday job, trigger_type='manual'.
export async function POST() {
  if (!getSessionToken()) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  try {
    const res = await legacyBackendFetch("/model-lab/learning-runs/start", { method: "POST" });
    const data = await safeJson(res);
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    if (isBackendUnreachable(err)) return backendUnreachableResponse();
    throw err;
  }
}
