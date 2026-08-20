import { NextRequest, NextResponse } from "next/server";
import { backendFetch, safeJson } from "@/lib/backend";
import { backendUnreachableResponse, getSessionToken, isBackendUnreachable } from "@/lib/route-helpers";

// POST /api/users/:id/premium/:entitlementId -> backend POST /api/admin/control-center/users/:id/premium/:entitlementId/revoke
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; entitlementId: string } }
) {
  const token = getSessionToken();
  if (!token) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    // reason ist optional beim Revoke.
  }

  try {
    const res = await backendFetch(
      `/users/${encodeURIComponent(params.id)}/premium/${encodeURIComponent(params.entitlementId)}/revoke`,
      { method: "POST", token, body: JSON.stringify(body) }
    );
    const data = await safeJson(res);
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    if (isBackendUnreachable(err)) return backendUnreachableResponse();
    throw err;
  }
}
