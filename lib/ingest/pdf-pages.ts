import { createRequire } from "node:module";
import type { SlideUpload } from "@/lib/ingest/slides";

export const MAX_PDF_VISION_PAGES = 12;

const requireCanvas = createRequire(import.meta.url);

function loadCanvas() {
  return Promise.resolve(requireCanvas("@napi-rs/canvas") as typeof import("@napi-rs/canvas"));
}

export async function renderPdfPagesForVision(
  bytes: Buffer,
  options?: { maxPages?: number; scale?: number },
): Promise<SlideUpload[]> {
  const { createIsomorphicCanvasFactory, getDocumentProxy, renderPageAsImage } = await import("unpdf");
  const CanvasFactory = await createIsomorphicCanvasFactory(loadCanvas);
  const pdf = await getDocumentProxy(new Uint8Array(bytes), { CanvasFactory });
  const limit = Math.min(pdf.numPages || 0, options?.maxPages ?? MAX_PDF_VISION_PAGES);
  if (limit < 1) return [];

  const pages: SlideUpload[] = [];
  for (let page = 1; page <= limit; page += 1) {
    try {
      const image = await renderPageAsImage(pdf, page, {
        canvasImport: loadCanvas,
        scale: options?.scale ?? 1.35,
      });
      pages.push({
        fileName: `page-${page}.png`,
        mimeType: "image/png",
        bytes: Buffer.from(image),
      });
    } catch {
      // skip a page that cannot be rasterized
    }
  }
  return pages;
}
