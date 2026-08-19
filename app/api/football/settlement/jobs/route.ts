import { NextRequest, NextResponse } from "next/server";
import { safeJson } from "@/lib/backend";
import { legacyBackendFetch } from "@/lib/legacyBackend";
import { backendUnreachableResponse, getSessionToken, isBackendUnreachable } from "@/lib/route-helpers";
import { mapSettlementJobRow } from "@/lib/settlementJob";

// GET /api/football/settlement/jobs -> backend GET /api/admin/football/matches/settle/recent
export async function GET() {
  if (!getSessionToken()) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  try {
    const res = await legacyBackendFetch("/football/matches/settle/recent?limit=20");
    const data = await safeJson<{ jobs?: Record<string, unknown>[] }>(res);
    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }
    const jobs = (data?.jobs ?? []).map(mapSettlementJobRow);
    return NextResponse.json({ jobs });
  } catch (err) {
    if (isBackendUnreachable(err)) return backendUnreachableResponse();
    throw err;
  }
}

// POST /api/football/settlement/jobs -> backend POST /api/admin/football/matches/settle
// Starts an async result-backfill job (does not settle tips/ROI, only
// football_matches.status/home_goals/away_goals - see routes.dart comment).
// Body: { minHoursSinceKickoff?: number, batchSize?: number }
export async function POST(req: NextRequest) {
  if (!getSessionToken()) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  let body: { minHoursSinceKickoff?: unknown; batchSize?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    // Kein Body ist ok - Backend verwendet dann seine Defaults.
  }

  const params = new URLSearchParams();
  if (typeof body.minHoursSinceKickoff === "number") {
    params.set("minHoursSinceKickoff", String(body.minHoursSinceKickoff));
  }
  if (typeof body.batchSize === "number") {
    params.set("batchSize", String(body.batchSize));
  }
  const qs = params.toString();

  try {
    const res = await legacyBackendFetch(`/football/matches/settle${qs ? `?${qs}` : ""}`, { method: "POST" });
    const data = await safeJson(res);
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    if (isBackendUnreachable(err)) return backendUnreachableResponse();
    throw err;
  }
}
