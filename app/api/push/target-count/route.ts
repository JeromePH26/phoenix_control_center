import { NextRequest, NextResponse } from "next/server";
import { backendFetch, safeJson } from "@/lib/backend";
import { backendUnreachableResponse, getSessionToken, isBackendUnreachable } from "@/lib/route-helpers";

// GET /api/push/target-count?targetType=&targetValue= -> backend GET /api/admin/control-center/push/target-count
// Section 19 (AN2): "Zielgruppen-Vorschau" - Anzahl der Geräte vor dem Senden.
export async function GET(req: NextRequest) {
  const token = getSessionToken();
  if (!token) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }
  const qs = req.nextUrl.searchParams.toString();
  try {
    const res = await backendFetch(`/push/target-count${qs ? `?${qs}` : ""}`, { token });
    const data = await safeJson(res);
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    if (isBackendUnreachable(err)) return backendUnreachableResponse();
    throw err;
  }
}
