import { NextRequest, NextResponse } from "next/server";
import { backendFetch, safeJson } from "@/lib/backend";
import { backendUnreachableResponse, getSessionToken, isBackendUnreachable } from "@/lib/route-helpers";

// GET /api/advertising/campaigns/:id -> backend GET /api/admin/control-center/advertising/campaigns/:id
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const token = getSessionToken();
  if (!token) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }
  try {
    const res = await backendFetch(`/advertising/campaigns/${encodeURIComponent(params.id)}`, { token });
    if (res.status === 404) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    const data = await safeJson(res);
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    if (isBackendUnreachable(err)) return backendUnreachableResponse();
    throw err;
  }
}

// PATCH /api/advertising/campaigns/:id -> backend PATCH /api/admin/control-center/advertising/campaigns/:id
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
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
    const res = await backendFetch(`/advertising/campaigns/${encodeURIComponent(params.id)}`, {
      method: "PATCH",
      token,
      body: JSON.stringify(body),
    });
    const data = await safeJson(res);
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    if (isBackendUnreachable(err)) return backendUnreachableResponse();
    throw err;
  }
}
