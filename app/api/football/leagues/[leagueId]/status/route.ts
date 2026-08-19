import { NextRequest, NextResponse } from "next/server";
import { safeJson } from "@/lib/backend";
import { legacyBackendFetch } from "@/lib/legacyBackend";
import { backendUnreachableResponse, getSessionToken, isBackendUnreachable } from "@/lib/route-helpers";

// POST /api/football/leagues/:leagueId/status -> backend POST /api/admin/football/leagues/:leagueId/status
// Body: { status: "auto" | "whitelist" | "blacklist" }
export async function POST(req: NextRequest, { params }: { params: { leagueId: string } }) {
  if (!getSessionToken()) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  let body: { status?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const value = typeof body?.status === "string" ? body.status : "";
  if (!value) {
    return NextResponse.json({ error: "status ist erforderlich." }, { status: 400 });
  }

  try {
    // Backend reads this from a query parameter (`value`), not a JSON body -
    // pre-existing legacy endpoint contract, adapted here.
    const res = await legacyBackendFetch(
      `/football/leagues/${encodeURIComponent(params.leagueId)}/status?value=${encodeURIComponent(value)}`,
      { method: "POST" },
    );
    const data = await safeJson(res);
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    if (isBackendUnreachable(err)) return backendUnreachableResponse();
    throw err;
  }
}
