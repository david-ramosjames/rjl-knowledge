import { fetchDropboxThumbnail, isDropboxConfigured } from "@/lib/dropbox/client";
import { parseGoogleDriveUrl } from "@/lib/drive";
import { normalizeDropboxUrl } from "@/lib/file-links";
import { prisma } from "@/lib/db/prisma";
import { TopicStatus } from "@/lib/generated/prisma/client";
import { logError } from "@/lib/logger";

export type DocumentPreview = {
  bytes: Buffer;
  mimeType: string;
};

export async function saveArticleThumbnail(articleId: string, preview: DocumentPreview) {
  await prisma.article.update({
    where: { id: articleId },
    data: {
      thumbnailBytes: Uint8Array.from(preview.bytes),
      thumbnailMime: preview.mimeType,
    },
  });
}

export async function captureArticleThumbnail(input: {
  articleId: string;
  fileName?: string | null;
  driveUrl?: string | null;
  dropboxPath?: string | null;
  pages?: { bytes: Buffer; mimeType: string }[];
  fileBytes?: Buffer | null;
}) {
  try {
    const preview = await buildDocumentPreview(input);
    if (!preview) return;
    await saveArticleThumbnail(input.articleId, preview);
  } catch (error) {
    logError("Document thumbnail capture failed", {
      articleId: input.articleId,
      message: error instanceof Error ? error.message : "unknown",
    });
  }
}

export async function getOrCreateArticleThumbnail(slug: string): Promise<DocumentPreview | null> {
  const article = await prisma.article.findFirst({
    where: { slug, status: TopicStatus.APPROVED },
    select: {
      id: true,
      driveUrl: true,
      fileName: true,
      thumbnailBytes: true,
      thumbnailMime: true,
      slides: {
        orderBy: { sortOrder: "asc" },
        take: 1,
        select: { bytes: true, mimeType: true },
      },
    },
  });
  if (!article) return null;

  if (article.thumbnailBytes && article.thumbnailMime) {
    return { bytes: Buffer.from(article.thumbnailBytes), mimeType: article.thumbnailMime };
  }

  const firstSlide = article.slides[0];
  if (firstSlide) {
    return { bytes: Buffer.from(firstSlide.bytes), mimeType: firstSlide.mimeType };
  }

  const preview = await buildDocumentPreview({
    fileName: article.fileName,
    driveUrl: article.driveUrl,
  });
  if (preview) {
    await saveArticleThumbnail(article.id, preview);
  }
  return preview;
}

async function buildDocumentPreview(input: {
  fileName?: string | null;
  driveUrl?: string | null;
  dropboxPath?: string | null;
  pages?: { bytes: Buffer; mimeType: string }[];
  fileBytes?: Buffer | null;
}): Promise<DocumentPreview | null> {
  const firstPage = input.pages?.[0];
  if (firstPage?.bytes.length) {
    return { bytes: firstPage.bytes, mimeType: firstPage.mimeType || "image/png" };
  }

  const dropboxUrl = input.driveUrl ? normalizeDropboxUrl(input.driveUrl) : null;
  if (isDropboxConfigured() && (dropboxUrl || input.dropboxPath)) {
    const fromDropbox = await fetchDropboxThumbnail({
      sharedUrl: dropboxUrl,
      path: input.dropboxPath ?? undefined,
    });
    if (fromDropbox) return fromDropbox;
  }

  if (input.fileBytes && isPdfName(input.fileName)) {
    const { renderPdfPagesForVision } = await import("@/lib/ingest/pdf-pages");
    const pages = await renderPdfPagesForVision(input.fileBytes, { maxPages: 1, scale: 1.1 });
    const page = pages[0];
    if (page) return { bytes: page.bytes, mimeType: page.mimeType };
  }

  const drive = input.driveUrl ? parseGoogleDriveUrl(input.driveUrl) : null;
  if (drive) {
    const fromDrive = await fetchDriveThumbnail(drive.id);
    if (fromDrive) return fromDrive;
  }

  return null;
}

function isPdfName(fileName?: string | null) {
  return (fileName ?? "").toLowerCase().endsWith(".pdf");
}

async function fetchDriveThumbnail(fileId: string): Promise<DocumentPreview | null> {
  const urls = [
    `https://drive.google.com/thumbnail?id=${fileId}&sz=w640`,
    `https://lh3.googleusercontent.com/d/${fileId}=w640`,
  ];
  for (const url of urls) {
    try {
      const response = await fetch(url, { redirect: "follow" });
      const type = response.headers.get("content-type") ?? "";
      if (!response.ok || !type.startsWith("image/")) continue;
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length < 80) continue;
      return { bytes, mimeType: type.split(";")[0] || "image/jpeg" };
    } catch {
      // try the next thumbnail URL
    }
  }
  return null;
}
