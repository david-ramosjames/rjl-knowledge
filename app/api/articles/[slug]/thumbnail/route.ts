import { NextResponse } from "next/server";
import { getOrCreateArticleThumbnail } from "@/lib/ingest/thumbnail";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const preview = await getOrCreateArticleThumbnail(slug);
  if (!preview) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(new Uint8Array(preview.bytes), {
    headers: {
      "Content-Type": preview.mimeType,
      "Cache-Control": "private, max-age=86400",
    },
  });
}
