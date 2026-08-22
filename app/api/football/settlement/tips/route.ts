import { NextRequest, NextResponse } from "next/server";
import { safeJson } from "@/lib/backend";
import { legacyBackendFetch } from "@/lib/legacyBackend";
import { backendUnreachableResponse, getSessionToken, isBackendUnreachable } from "@/lib/route-helpers";

/** Grades already-finished tips for one match day. Result data is fetched server-side. */
export async function POST(req: NextRequest) {
  if (!getSessionToken()) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  let body: { date?: unknown; reconcile?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Datum fehlt." }, { status: 400 });
  }
  if (typeof body.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
    return NextResponse.json({ error: "Bitte ein gültiges Datum auswählen." }, { status: 400 });
  }

  const params = new URLSearchParams({ date: body.date });
  if (body.reconcile === true) params.set("reconcile", "true");
  try {
    const res = await legacyBackendFetch(`/football/settle?${params.toString()}`, { method: "POST" });
    return NextResponse.json(await safeJson(res), { status: res.status });
  } catch (err) {
    if (isBackendUnreachable(err)) return backendUnreachableResponse();
    throw err;
  }
}
