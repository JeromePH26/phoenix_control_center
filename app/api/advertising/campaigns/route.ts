import { NextRequest, NextResponse } from "next/server";
import { backendFetch, safeJson } from "@/lib/backend";
import { backendUnreachableResponse, getSessionToken, isBackendUnreachable } from "@/lib/route-helpers";

// GET /api/advertising/campaigns?slot=&active= -> backend GET /api/admin/control-center/advertising/campaigns
export async function GET(req: NextRequest) {
  const token = getSessionToken();
  if (!token) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }
  const qs = req.nextUrl.searchParams.toString();
  try {
    const res = await backendFetch(`/advertising/campaigns${qs ? `?${qs}` : ""}`, { token });
    const data = await safeJson(res);
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    if (isBackendUnreachable(err)) return backendUnreachableResponse();
    throw err;
  }
}

// POST /api/advertising/campaigns -> backend POST /api/admin/control-center/advertising/campaigns
export async function POST(req: NextRequest) {
  const token = getSessionToken();
  if (!token) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  try {
    const res = await backendFetch("/advertising/campaigns", { method: "POST", token, body: JSON.stringify(body) });
    const data = await safeJson(res);
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    if (isBackendUnreachable(err)) return backendUnreachableResponse();
    throw err;
  }
}
