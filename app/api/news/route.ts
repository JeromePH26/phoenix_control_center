import { NextRequest, NextResponse } from "next/server";
import { backendFetch, safeJson } from "@/lib/backend";
import { backendUnreachableResponse, getSessionToken, isBackendUnreachable } from "@/lib/route-helpers";

// GET /api/news?status=&category= -> backend GET /api/admin/control-center/news/articles
export async function GET(req: NextRequest) {
  const token = getSessionToken();
  if (!token) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }
  const qs = req.nextUrl.searchParams.toString();
  try {
    const res = await backendFetch(`/news/articles${qs ? `?${qs}` : ""}`, { token });
    const data = await safeJson(res);
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    if (isBackendUnreachable(err)) return backendUnreachableResponse();
    throw err;
  }
}

// POST /api/news -> backend POST /api/admin/control-center/news/articles
export async function POST(req: NextRequest) {
  const token = getSessionToken();
  if (!token) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  try {
    const res = await backendFetch("/news/articles", { method: "POST", token, body: JSON.stringify(body) });
    const data = await safeJson(res);
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    if (isBackendUnreachable(err)) return backendUnreachableResponse();
    throw err;
  }
}
