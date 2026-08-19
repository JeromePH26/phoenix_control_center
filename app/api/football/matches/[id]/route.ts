import { NextRequest, NextResponse } from "next/server";
import { safeJson } from "@/lib/backend";
import { legacyBackendFetch } from "@/lib/legacyBackend";
import { backendUnreachableResponse, getSessionToken, isBackendUnreachable } from "@/lib/route-helpers";

// GET /api/football/matches/:id -> backend GET /api/admin/football/matches/:id
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!getSessionToken()) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  try {
    const res = await legacyBackendFetch(`/football/matches/${encodeURIComponent(params.id)}`);
    const data = await safeJson(res);
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    if (isBackendUnreachable(err)) return backendUnreachableResponse();
    throw err;
  }
}

// PATCH /api/football/matches/:id -> backend PATCH /api/admin/football/matches/:id
// Body: { visible?, analysisEnabled?, tipEnabled?, learningEnabled?, liveEnabled?, reason?, comment? }
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!getSessionToken()) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  try {
    const res = await legacyBackendFetch(`/football/matches/${encodeURIComponent(params.id)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    const data = await safeJson(res);
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    if (isBackendUnreachable(err)) return backendUnreachableResponse();
    throw err;
  }
}
