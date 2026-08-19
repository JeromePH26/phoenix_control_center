/**
 * Server-only session cookie helpers.
 *
 * The PHÖNIX backend session token is stored in an httpOnly cookie and is
 * NEVER exposed to client-side JavaScript. Only Next.js Route Handlers and
 * Server Components may read it (via `next/headers`) to attach it as an
 * `Authorization: Bearer <token>` header when calling the backend.
 */
export const SESSION_COOKIE_NAME = "phoenix_cc_session";

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};
