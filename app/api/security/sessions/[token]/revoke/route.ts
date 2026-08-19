import { NextResponse } from "next/server";
import { backendFetch, safeJson } from "@/lib/backend";
import { backendUnreachableResponse, getSessionToken, isBackendUnreachable } from "@/lib/route-helpers";

export async function POST(_req: Request, { params }: { params: { token: string } }) {
  const sessionToken = getSessionToken();
  if (!sessionToken) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  try {
    const res = await backendFetch(`/security/sessions/${encodeURIComponent(params.token)}/revoke`, {
      method: "POST",
      token: sessionToken,
    });
    const data = await safeJson(res);
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    if (isBackendUnreachable(err)) return backendUnreachableResponse();
    throw err;
  }
}
