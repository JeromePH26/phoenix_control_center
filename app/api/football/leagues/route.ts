import { NextResponse } from "next/server";
import { safeJson } from "@/lib/backend";
import { legacyBackendFetch } from "@/lib/legacyBackend";
import { backendUnreachableResponse, getSessionToken, isBackendUnreachable } from "@/lib/route-helpers";

// GET /api/football/leagues -> backend GET /api/admin/football/leagues
export async function GET() {
  if (!getSessionToken()) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  try {
    const res = await legacyBackendFetch("/football/leagues");
    const data = await safeJson(res);
    if (!res.ok || data == null || typeof data !== "object") {
      return NextResponse.json(data, { status: res.status });
    }
    // Backend returns raw DB column names (league_id, league_name,
    // manual_status, ...) for this pre-existing endpoint. Adapt here rather
    // than changing a stable legacy response shape.
    const raw = (data as { leagues?: unknown[] }).leagues;
    const leagues = Array.isArray(raw)
      ? raw.map((row) => {
          const r = row as Record<string, unknown>;
          return {
            ...r,
            leagueId: r.league_id,
            name: r.league_name,
            manualStatus: r.manual_status,
          };
        })
      : [];
    return NextResponse.json({ ...data, leagues }, { status: res.status });
  } catch (err) {
    if (isBackendUnreachable(err)) return backendUnreachableResponse();
    throw err;
  }
}
