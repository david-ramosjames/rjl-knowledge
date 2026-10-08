import { AppError, ErrorCodes } from "@/lib/errors";

export const MAX_SLIDES = 16;
export const MAX_SLIDE_BYTES = 8 * 1024 * 1024;

const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export type SlideUpload = {
  fileName: string;
  mimeType: string;
  bytes: Buffer;
};

export async function collectSlideUploads(formData: FormData): Promise<SlideUpload[]> {
  const files = formData
    .getAll("slides")
    .filter((item): item is File => item instanceof File && item.size > 0);

  if (files.length === 0) return [];
  if (files.length > MAX_SLIDES) {
    throw new AppError(
      ErrorCodes.INGEST_FAILED,
      `Upload at most ${MAX_SLIDES} slides at a time. Split a longer deck into more than one article if needed.`,
    );
  }

  const slides: SlideUpload[] = [];
  for (const file of files) {
    if (file.size > MAX_SLIDE_BYTES) {
      throw new AppError(
        ErrorCodes.INGEST_FAILED,
        `${file.name} is larger than 8 MB. Use a smaller screenshot or JPEG.`,
      );
    }
    const mimeType = mimeTypeForFile(file);
    if (!mimeType) {
      throw new AppError(
        ErrorCodes.INGEST_FAILED,
        `${file.name} is not a supported image. Use JPEG, PNG, WebP, or GIF screenshots.`,
      );
    }
    slides.push({
      fileName: file.name,
      mimeType,
      bytes: Buffer.from(await file.arrayBuffer()),
    });
  }
  return slides;
}

function mimeTypeForFile(file: File) {
  const type = file.type.toLowerCase();
  if (type.startsWith("image/") && Object.values(MIME_BY_EXT).includes(type)) return type;
  const lower = file.name.toLowerCase();
  const ext = Object.keys(MIME_BY_EXT).find((item) => lower.endsWith(item));
  return ext ? MIME_BY_EXT[ext] : null;
}
