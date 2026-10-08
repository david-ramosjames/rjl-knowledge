import { NextResponse } from "next/server";
import { getArticleSlide } from "@/lib/db/articles";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params;
  const slide = await getArticleSlide(slug, id);
  if (!slide) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(new Uint8Array(slide.bytes), {
    headers: {
      "Content-Type": slide.mimeType,
      "Content-Disposition": `inline; filename="${slide.fileName.replace(/"/g, "")}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
