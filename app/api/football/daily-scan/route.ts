import { NextRequest, NextResponse } from "next/server";
import { safeJson } from "@/lib/backend";
import { legacyBackendFetch } from "@/lib/legacyBackend";
import { backendUnreachableResponse, getSessionToken, isBackendUnreachable } from "@/lib/route-helpers";

/** Starts the existing server-side daily pipeline without exposing the admin token to the browser. */
export async function POST(req: NextRequest) {
  if (!getSessionToken()) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  let body: { date?: unknown; limit?: unknown; minimumDataQuality?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    // Use backend defaults when no body was provided.
  }

  const params = new URLSearchParams();
  if (typeof body.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date)) params.set("date", body.date);
  if (typeof body.limit === "number") params.set("limit", String(body.limit));
  if (typeof body.minimumDataQuality === "number") params.set("minimumDataQuality", String(body.minimumDataQuality));

  try {
    const qs = params.toString();
    const res = await legacyBackendFetch(`/football/daily-scan${qs ? `?${qs}` : ""}`, { method: "POST" });
    return NextResponse.json(await safeJson(res), { status: res.status });
  } catch (err) {
    if (isBackendUnreachable(err)) return backendUnreachableResponse();
    throw err;
  }
}
