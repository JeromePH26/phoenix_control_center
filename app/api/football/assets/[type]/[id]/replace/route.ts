import { NextRequest, NextResponse } from "next/server";
import { safeJson } from "@/lib/backend";
import { legacyBackendFetch } from "@/lib/legacyBackend";
import { backendUnreachableResponse, getSessionToken, isBackendUnreachable } from "@/lib/route-helpers";

// POST /api/football/assets/:type/:id/replace (multipart/form-data, field "file")
// -> backend POST /api/admin/football/assets/:type/:id/replace { imageBase64, contentType }
//
// The browser uploads the raw file to us as multipart/form-data; we read it
// server-side, base64-encode it here, and forward it to the backend with
// the legacy admin token attached. The browser never talks to the backend
// directly and never sees that token.
export async function POST(req: NextRequest, { params }: { params: { type: string; id: string } }) {
  if (!getSessionToken()) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "missing_file" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const imageBase64 = buffer.toString("base64");
  const contentType = file.type || "application/octet-stream";

  try {
    const res = await legacyBackendFetch(
      `/football/assets/${encodeURIComponent(params.type)}/${encodeURIComponent(params.id)}/replace`,
      {
        method: "POST",
        body: JSON.stringify({ imageBase64, contentType }),
      }
    );
    const data = await safeJson(res);
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    if (isBackendUnreachable(err)) return backendUnreachableResponse();
    throw err;
  }
}
