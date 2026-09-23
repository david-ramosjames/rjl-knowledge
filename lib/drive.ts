const DRIVE_HOSTS = new Set(["drive.google.com", "docs.google.com"]);

export type DriveResource = {
  id: string;
  kind: "document" | "spreadsheet" | "presentation" | "file";
  url: string;
};

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

export function parseGoogleDriveUrl(input: string): DriveResource | null {
  const url = normalizeGoogleDriveUrl(input);
  if (!url) return null;

  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);
    const idFromQuery = parsed.searchParams.get("id");

    if (parts[0] === "document" && parts[1] === "d" && parts[2]) {
      return { id: parts[2], kind: "document", url };
    }
    if (parts[0] === "spreadsheets" && parts[1] === "d" && parts[2]) {
      return { id: parts[2], kind: "spreadsheet", url };
    }
    if (parts[0] === "presentation" && parts[1] === "d" && parts[2]) {
      return { id: parts[2], kind: "presentation", url };
    }
    if (parts[0] === "file" && parts[1] === "d" && parts[2]) {
      return { id: parts[2], kind: "file", url };
    }
    if (idFromQuery) {
      return { id: idFromQuery, kind: "file", url };
    }
    return null;
  } catch {
    return null;
  }
}

export function googleDriveFileName(input: string | null | undefined): string | null {
  const raw = input?.trim();
  return raw ? raw : null;
}

export function driveExportUrl(resource: DriveResource): string[] {
  if (resource.kind === "document") {
    return [`https://docs.google.com/document/d/${resource.id}/export?format=txt`];
  }
  if (resource.kind === "spreadsheet") {
    return [`https://docs.google.com/spreadsheets/d/${resource.id}/export?format=csv`];
  }
  if (resource.kind === "presentation") {
    return [
      `https://docs.google.com/presentation/d/${resource.id}/export/txt`,
      `https://docs.google.com/presentation/d/${resource.id}/export?format=txt`,
    ];
  }
  return [
    `https://drive.google.com/uc?export=download&id=${resource.id}&confirm=t`,
    `https://drive.google.com/uc?id=${resource.id}&export=download`,
  ];
}
