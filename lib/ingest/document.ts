import { driveExportUrl, parseGoogleDriveUrl } from "@/lib/drive";
import { dropboxDownloadUrls, fileNameFromShareUrl, normalizeDropboxUrl } from "@/lib/file-links";
import { AppError, ErrorCodes } from "@/lib/errors";

const MAX_CHARS = 80_000;
const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;

export type IngestedDocument = {
  text: string;
  fileName?: string;
};

export async function ingestDocumentSource(input: {
  driveUrl: string;
  uploaded?: File | null;
  pastedText?: string;
}): Promise<IngestedDocument> {
  if (input.uploaded && input.uploaded.size > 0) {
    return extractUploadedFile(input.uploaded);
  }

  const fromLink = await fetchSharedFileText(input.driveUrl);
  if (fromLink?.text) return fromLink;

  const pasted = input.pastedText?.trim();
  if (pasted) {
    return { text: clipText(pasted) };
  }

  throw new AppError(
    ErrorCodes.INGEST_FAILED,
    "The AI could not open that file. Share the Dropbox or Drive link so anyone with the link can view it, or upload the file so it can be ingested.",
  );
}

async function fetchSharedFileText(fileUrl: string): Promise<IngestedDocument | null> {
  const drive = parseGoogleDriveUrl(fileUrl);
  const dropbox = normalizeDropboxUrl(fileUrl);
  const urls = drive ? driveExportUrl(drive) : dropbox ? dropboxDownloadUrls(dropbox) : [];
  if (urls.length === 0) return null;

  const fallbackName = drive
    ? `${drive.kind}.bin`
    : fileNameFromShareUrl(fileUrl) ?? "document.bin";

  for (const url of urls) {
    const fetched = await fetchRemoteFile(url, fallbackName);
    if (fetched) return fetched;
  }

  return null;
}

async function fetchRemoteFile(url: string, fallbackName: string): Promise<IngestedDocument | null> {
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(20_000),
      headers: {
        "User-Agent": "RJL-Knowledge-Hub/1.0",
      },
    });
    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") ?? "";
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length === 0) return null;
    if (looksLikeHtml(contentType, bytes)) return null;

    const fileName =
      fileNameFromDisposition(response.headers.get("content-disposition")) ??
      fileNameFromShareUrl(url) ??
      fallbackName;
    const text = await extractBytes(bytes, contentType, fileName);
    if (!text.trim()) return null;
    return { text: clipText(text), fileName };
  } catch {
    return null;
  }
}

async function extractUploadedFile(file: File): Promise<IngestedDocument> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new AppError(
      ErrorCodes.INGEST_FAILED,
      "That file is larger than 12 MB. Upload a smaller file, or share a Dropbox or Drive link the hub can read.",
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const text = await extractBytes(bytes, file.type, file.name);
  if (!text.trim()) {
    throw new AppError(
      ErrorCodes.INGEST_FAILED,
      "The AI could not read any text from that file. Try a PDF, Word document, Google Doc, or plain text file.",
    );
  }

  return { text: clipText(text), fileName: file.name };
}

async function extractBytes(bytes: Buffer, contentType: string, fileName: string) {
  const lowerName = fileName.toLowerCase();
  const type = contentType.toLowerCase();

  if (
    type.startsWith("text/") ||
    type.includes("json") ||
    type.includes("csv") ||
    lowerName.endsWith(".txt") ||
    lowerName.endsWith(".md") ||
    lowerName.endsWith(".csv") ||
    lowerName.endsWith(".json")
  ) {
    return bytes.toString("utf8");
  }

  if (lowerName.endsWith(".docx") || type.includes("wordprocessingml")) {
    const mammothMod = await import("mammoth");
    const mammoth = mammothMod.default ?? mammothMod;
    const result = await mammoth.extractRawText({ buffer: bytes });
    return result.value;
  }

  if (lowerName.endsWith(".pdf") || type.includes("pdf")) {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(bytes));
    const extracted = await extractText(pdf, { mergePages: true });
    return extracted.text || "";
  }

  const asText = bytes.toString("utf8");
  if (!looksLikeHtml(type, bytes) && asText.replace(/\s/g, "").length > 40) {
    return asText;
  }

  throw new AppError(
    ErrorCodes.INGEST_FAILED,
    "That file type is not supported yet. Use a Google Doc, PDF, Word document, or text file.",
  );
}

function looksLikeHtml(contentType: string, bytes: Buffer) {
  if (contentType.includes("text/html")) return true;
  const start = bytes.subarray(0, 200).toString("utf8").trimStart().toLowerCase();
  return start.startsWith("<!doctype html") || start.startsWith("<html");
}

function fileNameFromDisposition(header: string | null) {
  if (!header) return null;
  const utf = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf?.[1]) return decodeURIComponent(utf[1]);
  const plain = header.match(/filename="([^"]+)"/i) ?? header.match(/filename=([^;]+)/i);
  return plain?.[1]?.trim() ?? null;
}

function clipText(text: string) {
  return text.trim().slice(0, MAX_CHARS);
}
