import { NextRequest, NextResponse } from "next/server";
import { backendFetch, safeJson } from "@/lib/backend";
import { backendUnreachableResponse, getSessionToken, isBackendUnreachable } from "@/lib/route-helpers";

// POST /api/users/:id/sessions/:token -> backend POST /api/admin/control-center/users/:id/sessions/:token/revoke
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string; token: string } }
) {
  const sessionToken = getSessionToken();
  if (!sessionToken) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  try {
    const res = await backendFetch(
      `/users/${encodeURIComponent(params.id)}/sessions/${encodeURIComponent(params.token)}/revoke`,
      { method: "POST", token: sessionToken }
    );
    const data = await safeJson(res);
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    if (isBackendUnreachable(err)) return backendUnreachableResponse();
    throw err;
  }
}
