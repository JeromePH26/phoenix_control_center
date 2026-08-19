import "server-only";

/**
 * Base URL of the PHÖNIX Dart (shelf) backend. Server-only — must never be
 * inlined into client bundles. Overridable via `.env.local` for local dev
 * (e.g. `PHOENIX_BACKEND_URL=http://localhost:8080`).
 */
export const PHOENIX_BACKEND_URL =
  process.env.PHOENIX_BACKEND_URL ??
  "https://energetic-peace-production-b6f2.up.railway.app";

const CONTROL_CENTER_BASE = `${PHOENIX_BACKEND_URL}/api/admin/control-center`;

export class BackendUnreachableError extends Error {
  constructor(cause: unknown) {
    super("PHOENIX backend is unreachable");
    this.name = "BackendUnreachableError";
    this.cause = cause;
  }
}

/**
 * Calls an endpoint under /api/admin/control-center on the PHÖNIX backend.
 * `path` must start with "/" (e.g. "/employees", "/auth/login").
 */
export async function backendFetch(
  path: string,
  init: RequestInit & { token?: string | null } = {}
): Promise<Response> {
  const { token, headers, ...rest } = init;

  const finalHeaders = new Headers(headers);
  if (!finalHeaders.has("Content-Type") && rest.body) {
    finalHeaders.set("Content-Type", "application/json");
  }
  if (token) {
    finalHeaders.set("Authorization", `Bearer ${token}`);
  }

  try {
    return await fetch(`${CONTROL_CENTER_BASE}${path}`, {
      ...rest,
      headers: finalHeaders,
      cache: "no-store",
    });
  } catch (err) {
    throw new BackendUnreachableError(err);
  }
}

/** Attempts to parse a JSON body; returns null on empty/invalid bodies. */
export async function safeJson<T = unknown>(res: Response): Promise<T | null> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}
