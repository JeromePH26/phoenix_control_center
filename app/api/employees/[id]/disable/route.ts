import { NextRequest, NextResponse } from "next/server";
import { backendFetch, safeJson } from "@/lib/backend";
import { backendUnreachableResponse, getSessionToken, isBackendUnreachable } from "@/lib/route-helpers";

// POST /api/employees/:id/disable -> backend POST /api/admin/control-center/employees/:id/disable
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = getSessionToken();
  if (!token) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  try {
    const res = await backendFetch(`/employees/${encodeURIComponent(params.id)}/disable`, {
      method: "POST",
      token,
    });
    const data = await safeJson(res);
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    if (isBackendUnreachable(err)) return backendUnreachableResponse();
    throw err;
  }
}
