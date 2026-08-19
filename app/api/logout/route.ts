import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/backend";
import { SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from "@/lib/session";
import { getSessionToken } from "@/lib/route-helpers";

// POST /api/logout -> backend POST /api/admin/control-center/auth/logout
// Always clears the local session cookie, even if the backend call fails,
// so the user is never stuck "logged in" locally.
export async function POST() {
  const token = getSessionToken();

  if (token) {
    try {
      await backendFetch("/auth/logout", { method: "POST", token });
    } catch {
      // Backend unreachable: still clear the local cookie below.
    }
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    ...SESSION_COOKIE_OPTIONS,
    expires: new Date(0),
  });
  return response;
}
