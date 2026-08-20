import { NextRequest, NextResponse } from "next/server";
import { safeJson } from "@/lib/backend";
import { legacyBackendFetch } from "@/lib/legacyBackend";
import { backendUnreachableResponse, getSessionToken, isBackendUnreachable } from "@/lib/route-helpers";

// GET /api/football/data-coverage-detail?<leagueId|teamId> -> backend GET /api/admin/football/data-coverage-detail?<...>
// Distinct from /api/football/data-coverage (the whitelist daily-report endpoint):
// this one answers "what does PHÖNIX actually have stored" for a single league/team.
export async function GET(req: NextRequest) {
  if (!getSessionToken()) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  try {
    const res = await legacyBackendFetch(`/football/data-coverage-detail${req.nextUrl.search}`);
    const data = await safeJson(res);
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    if (isBackendUnreachable(err)) return backendUnreachableResponse();
    throw err;
  }
}
