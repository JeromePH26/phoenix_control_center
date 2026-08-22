import { NextResponse } from "next/server";
import { safeJson } from "@/lib/backend";
import { legacyBackendFetch } from "@/lib/legacyBackend";
import { backendUnreachableResponse, getSessionToken, isBackendUnreachable } from "@/lib/route-helpers";

export async function GET(_req: Request, { params }: { params: { jobId: string } }) {
  if (!getSessionToken()) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  try {
    const res = await legacyBackendFetch(`/football/daily-scan/${encodeURIComponent(params.jobId)}`);
    return NextResponse.json(await safeJson(res), { status: res.status });
  } catch (err) {
    if (isBackendUnreachable(err)) return backendUnreachableResponse();
    throw err;
  }
}
