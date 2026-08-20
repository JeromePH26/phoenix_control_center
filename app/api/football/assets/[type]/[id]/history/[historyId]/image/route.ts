import { NextResponse } from "next/server";
import { legacyBackendFetch } from "@/lib/legacyBackend";
import { getSessionToken } from "@/lib/route-helpers";

// GET /api/football/assets/[type]/[id]/history/[historyId]/image -> streams
// GET /api/admin/football/assets/<type>/<id>/history/<historyId>/image
export async function GET(
  _req: Request,
  { params }: { params: { type: string; id: string; historyId: string } }
) {
  if (!getSessionToken()) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  try {
    const res = await legacyBackendFetch(
      `/football/assets/${encodeURIComponent(params.type)}/${encodeURIComponent(params.id)}/history/${encodeURIComponent(params.historyId)}/image`
    );
    if (!res.ok) {
      return NextResponse.json({ error: "Bild nicht verfügbar." }, { status: res.status });
    }
    const contentType = res.headers.get("content-type") ?? "image/png";
    const bytes = await res.arrayBuffer();
    return new NextResponse(bytes, { headers: { "Content-Type": contentType, "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Backend nicht erreichbar." }, { status: 502 });
  }
}
