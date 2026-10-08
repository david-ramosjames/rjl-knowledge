import type { SlideUpload } from "@/lib/ingest/slides";

export const MAX_PDF_VISION_PAGES = 12;

export async function renderPdfPagesForVision(bytes: Buffer): Promise<SlideUpload[]> {
  const { createIsomorphicCanvasFactory, getDocumentProxy, renderPageAsImage } = await import("unpdf");
  const canvasImport = () => import("@napi-rs/canvas");
  const CanvasFactory = await createIsomorphicCanvasFactory(canvasImport);
  const pdf = await getDocumentProxy(new Uint8Array(bytes), { CanvasFactory });
  const limit = Math.min(pdf.numPages || 0, MAX_PDF_VISION_PAGES);
  if (limit < 1) return [];

  const pages: SlideUpload[] = [];
  for (let page = 1; page <= limit; page += 1) {
    try {
      const image = await renderPageAsImage(pdf, page, {
        canvasImport,
        scale: 1.35,
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

export function isPdfFile(fileName: string, contentType = "") {
  return fileName.toLowerCase().endsWith(".pdf") || contentType.toLowerCase().includes("pdf");
}

export function hasUsableDocumentText(text: string) {
  return text.replace(/[^a-zA-Z]/g, "").length >= 180;
}
