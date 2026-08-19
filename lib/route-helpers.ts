import "server-only";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/session";
import { BackendUnreachableError } from "@/lib/backend";

/** Reads the backend session token from the httpOnly cookie (server-only). */
export function getSessionToken(): string | null {
  return cookies().get(SESSION_COOKIE_NAME)?.value ?? null;
}

/**
 * Standard error response for when the PHÖNIX backend itself could not be
 * reached (e.g. it is down or the parallel effort adding these routes
 * hasn't shipped yet). Never fabricate data in this case.
 */
export function backendUnreachableResponse() {
  return NextResponse.json(
    { error: "backend_unreachable" },
    { status: 502 }
  );
}

export function isBackendUnreachable(err: unknown): boolean {
  return err instanceof BackendUnreachableError;
}
