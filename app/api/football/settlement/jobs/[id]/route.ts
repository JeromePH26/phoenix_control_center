import { NextResponse } from "next/server";
import { safeJson } from "@/lib/backend";
import { legacyBackendFetch } from "@/lib/legacyBackend";
import { backendUnreachableResponse, getSessionToken, isBackendUnreachable } from "@/lib/route-helpers";
import { mapSettlementJobRow } from "@/lib/settlementJob";

// GET /api/football/settlement/jobs/:id -> backend GET /api/admin/football/matches/settle/:id
// Used by the settlement page to poll a running job's progress.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!getSessionToken()) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  try {
    const res = await legacyBackendFetch(`/football/matches/settle/${encodeURIComponent(params.id)}`);
    if (res.status === 404) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    const data = await safeJson<Record<string, unknown>>(res);
    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }
    return NextResponse.json(mapSettlementJobRow(data));
  } catch (err) {
    if (isBackendUnreachable(err)) return backendUnreachableResponse();
    throw err;
  }
}
