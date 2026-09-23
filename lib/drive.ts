const DRIVE_HOSTS = new Set(["drive.google.com", "docs.google.com"]);

export function normalizeGoogleDriveUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  try {
    const withProtocol = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
    const url = new URL(withProtocol);
    const host = url.hostname.toLowerCase();
    if (!DRIVE_HOSTS.has(host)) return null;
    url.protocol = "https:";
    return url.toString();
  } catch {
    return null;
  }
}

export function googleDriveFileName(input: string | null | undefined): string | null {
  const raw = input?.trim();
  return raw ? raw : null;
}
