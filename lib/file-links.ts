import { normalizeGoogleDriveUrl, parseGoogleDriveUrl } from "@/lib/drive";

const DROPBOX_HOSTS = new Set([
  "dropbox.com",
  "www.dropbox.com",
  "dl.dropbox.com",
  "dl.dropboxusercontent.com",
]);

export type FileShareProvider = "drive" | "dropbox";

export function normalizeFileShareUrl(input: string): string | null {
  return normalizeGoogleDriveUrl(input) ?? normalizeDropboxUrl(input);
}

export function fileShareProvider(input: string): FileShareProvider | null {
  if (parseGoogleDriveUrl(input) || normalizeGoogleDriveUrl(input)) return "drive";
  if (normalizeDropboxUrl(input)) return "dropbox";
  return null;
}

export function normalizeDropboxUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  try {
    const withProtocol = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
    const url = new URL(withProtocol);
    const host = url.hostname.toLowerCase();
    if (!DROPBOX_HOSTS.has(host)) return null;
    if (!isDropboxSharePath(url)) return null;
    url.protocol = "https:";
    return url.toString();
  } catch {
    return null;
  }
}

export function dropboxDownloadUrls(input: string): string[] {
  const normalized = normalizeDropboxUrl(input);
  if (!normalized) return [];

  const urls = new Set<string>();
  const withDownload = new URL(normalized);
  withDownload.searchParams.set("dl", "1");
  withDownload.searchParams.delete("raw");
  urls.add(withDownload.toString());

  const withRaw = new URL(normalized);
  withRaw.searchParams.set("raw", "1");
  withRaw.searchParams.delete("dl");
  urls.add(withRaw.toString());

  const content = new URL(withDownload.toString());
  if (!content.hostname.includes("dropboxusercontent")) {
    content.hostname = "dl.dropboxusercontent.com";
    urls.add(content.toString());
  }

  return [...urls];
}

export function fileNameFromShareUrl(input: string): string | null {
  try {
    const url = new URL(input);
    const last = url.pathname.split("/").filter(Boolean).at(-1);
    if (!last) return null;
    const decoded = decodeURIComponent(last).trim();
    if (!decoded || decoded === "view" || decoded === "edit" || decoded.length < 3) return null;
    return decoded;
  } catch {
    return null;
  }
}

export function optionalFileName(input: string | null | undefined): string | null {
  const raw = input?.trim();
  return raw ? raw : null;
}

export function fileHostLabel(input: string): "Dropbox" | "Google Drive" {
  return fileShareProvider(input) === "dropbox" ? "Dropbox" : "Google Drive";
}

function isDropboxSharePath(url: URL) {
  const host = url.hostname.toLowerCase();
  if (host === "dl.dropboxusercontent.com" || host === "dl.dropbox.com") return true;
  const path = url.pathname.toLowerCase();
  return path.startsWith("/s/") || path.startsWith("/scl/") || path.startsWith("/sh/");
}
