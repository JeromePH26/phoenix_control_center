import { NextRequest, NextResponse } from "next/server";
import { backendFetch, safeJson } from "@/lib/backend";
import { SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from "@/lib/session";
import { backendUnreachableResponse, isBackendUnreachable } from "@/lib/route-helpers";
import type { LoginResponse } from "@/lib/types";

// POST /api/login -> backend POST /api/admin/control-center/auth/login
// On success, sets the httpOnly session cookie and returns only the
// employee profile to the client. The raw backend token never reaches
// client-side JavaScript.
export async function POST(req: NextRequest) {
  let body: { login?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  if (!body.login || !body.password) {
    return NextResponse.json({ error: "missing_credentials" }, { status: 400 });
  }

  try {
    const res = await backendFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ login: body.login, password: body.password }),
    });

    if (!res.ok) {
      const data = await safeJson<{ error?: string }>(res);
      return NextResponse.json(
        { error: data?.error ?? "login_failed" },
        { status: res.status }
      );
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
