import "server-only";
import { BackendUnreachableError, PHOENIX_BACKEND_URL } from "@/lib/backend";

const ADMIN_BASE = `${PHOENIX_BACKEND_URL}/api/admin`;

/**
 * Calls an endpoint under /api/admin on the PHÖNIX backend using the legacy
 * static admin token (`PHOENIX_ADMIN_TOKEN`), NOT the Control Center session
 * cookie (see lib/backend.ts for that mechanism). This pre-dates the Control
 * Center — it's the same shared secret the Flutter Model Lab admin screen
 * uses — and protects `/api/admin/football/*` and `/api/admin/model-lab/*`.
 *
 * Server-only. The token must never reach the browser: only Next.js Route
 * Handlers / Server Components may call this, and only to proxy the new
 * Football admin endpoints.
 *
 * `path` must start with "/" (e.g. "/football/matches").
 */
export async function legacyBackendFetch(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const { headers, ...rest } = init;

  const finalHeaders = new Headers(headers);
  if (!finalHeaders.has("Content-Type") && rest.body) {
    finalHeaders.set("Content-Type", "application/json");
  }
  const token = process.env.PHOENIX_ADMIN_TOKEN;
  if (token) {
    finalHeaders.set("Authorization", `Bearer ${token}`);
  }

  try {
    return await fetch(`${ADMIN_BASE}${path}`, {
      ...rest,
      headers: finalHeaders,
      cache: "no-store",
    });
  } catch (err) {
    throw new BackendUnreachableError(err);
  }
}
