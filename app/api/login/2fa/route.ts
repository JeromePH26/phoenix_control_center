import { NextRequest, NextResponse } from "next/server";
import { backendFetch, safeJson } from "@/lib/backend";
import { SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from "@/lib/session";
import { backendUnreachableResponse, isBackendUnreachable } from "@/lib/route-helpers";
import type { LoginResponse } from "@/lib/types";

// POST /api/login/2fa -> backend POST /api/admin/control-center/auth/2fa/verify-login
// Section 32 (AN2): zweiter Schritt nach requiresTwoFactor=true. Setzt bei
// Erfolg dieselbe httpOnly-Session-Cookie wie /api/login.
export async function POST(req: NextRequest) {
  let body: { pendingToken?: string; code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  if (!body.pendingToken || !body.code) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  try {
    const res = await backendFetch("/auth/2fa/verify-login", {
      method: "POST",
      body: JSON.stringify({ pendingToken: body.pendingToken, code: body.code }),
    });

    if (!res.ok) {
      const data = await safeJson<{ error?: string }>(res);
      return NextResponse.json({ error: data?.error ?? "verification_failed" }, { status: res.status });
    }

    const data = await safeJson<LoginResponse>(res);
    if (!data?.token || !data?.employee) {
      return NextResponse.json({ error: "malformed_backend_response" }, { status: 502 });
    }

    const response = NextResponse.json({ employee: data.employee });
    response.cookies.set(SESSION_COOKIE_NAME, data.token, {
      ...SESSION_COOKIE_OPTIONS,
      expires: data.expiresAt ? new Date(data.expiresAt) : undefined,
    });
    return response;
  } catch (err) {
    if (isBackendUnreachable(err)) return backendUnreachableResponse();
    throw err;
  }
}
