import { NextRequest, NextResponse } from "next/server";
import { safeJson } from "@/lib/backend";
import { legacyBackendFetch } from "@/lib/legacyBackend";
import { backendUnreachableResponse, getSessionToken, isBackendUnreachable } from "@/lib/route-helpers";

// GET /api/model-lab/audit-log?limit= -> backend GET /api/admin/model-lab/audit-log?limit=
// Section 13 (AN2): Quelle für "Statusgrund" auf der Modell-Detailseite -
// das Backend schreibt hier bei jeder Beförderung/Rollback/Ablehnung bereits
// einen Eintrag, nur wurde er bisher nie gelesen. Nicht nach model_version_id
// filterbar (das Backend kennt diesen Parameter nicht) - die Modell-
// Detailseite filtert client-seitig auf den zurückgegebenen Ausschnitt.
export async function GET(req: NextRequest) {
  if (!getSessionToken()) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const qs = req.nextUrl.searchParams.toString();

  try {
    const res = await legacyBackendFetch(`/model-lab/audit-log${qs ? `?${qs}` : ""}`);
    const data = await safeJson(res);
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    if (isBackendUnreachable(err)) return backendUnreachableResponse();
    throw err;
  }
}
