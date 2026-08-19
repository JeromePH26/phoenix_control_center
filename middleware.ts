import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/session";

// Gates every route under the (dashboard) route group. This only checks
// whether a session cookie is present, not whether it is still valid with
// the backend — a server component's /auth/me call handles that and
// redirects on 401.
export function middleware(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/overview/:path*",
    "/administration/:path*",
    "/football/:path*",
    "/infrastructure/:path*",
    "/app-control/:path*",
    "/model-lab/:path*",
    "/users/:path*",
    "/support/:path*",
  ],
};
