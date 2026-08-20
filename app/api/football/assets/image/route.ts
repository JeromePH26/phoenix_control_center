import { NextRequest, NextResponse } from "next/server";
import { PHOENIX_BACKEND_URL } from "@/lib/backend";
import { getSessionToken } from "@/lib/route-helpers";

// GET /api/football/assets/image?type=team&id=X&source=<url> -> streams
// GET {PHOENIX_BACKEND_URL}/api/assets/team/X?source=<url>
//
// The backend endpoint itself is public (the Flutter app calls it directly),
// but this proxy is still gated on the Control Center session so the image
// URL never has to be constructed with a hardcoded backend host in
// browser-visible code.
export async function GET(req: NextRequest) {
  if (!getSessionToken()) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const type = req.nextUrl.searchParams.get("type");
  const id = req.nextUrl.searchParams.get("id");
  const source = req.nextUrl.searchParams.get("source");
  if (!type || !id) {
    return NextResponse.json({ error: "type und id sind erforderlich." }, { status: 400 });
  }

  const qs = source ? `?source=${encodeURIComponent(source)}` : "";
  try {
    const res = await fetch(
      `${PHOENIX_BACKEND_URL}/api/assets/${encodeURIComponent(type)}/${encodeURIComponent(id)}${qs}`,
      { cache: "no-store" }
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
