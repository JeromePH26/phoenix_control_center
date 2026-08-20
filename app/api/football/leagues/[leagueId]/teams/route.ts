import { NextResponse } from "next/server";
import { safeJson } from "@/lib/backend";
import { legacyBackendFetch } from "@/lib/legacyBackend";
import { backendUnreachableResponse, getSessionToken, isBackendUnreachable } from "@/lib/route-helpers";

// GET /api/football/leagues/[leagueId]/teams -> backend GET /api/admin/football/leagues/<leagueId>/teams
export async function GET(_req: Request, { params }: { params: { leagueId: string } }) {
  if (!getSessionToken()) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  try {
    const res = await legacyBackendFetch(`/football/leagues/${encodeURIComponent(params.leagueId)}/teams`);
    const data = await safeJson(res);
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    if (isBackendUnreachable(err)) return backendUnreachableResponse();
    throw err;
  }
}
