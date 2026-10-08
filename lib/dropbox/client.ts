import { AppError, ErrorCodes } from "@/lib/errors";
import { normalizeDropboxUrl } from "@/lib/file-links";

const API = "https://api.dropboxapi.com/2";
const CONTENT = "https://content.dropboxapi.com/2";

export function isDropboxConfigured() {
  return Boolean(process.env.DROPBOX_ACCESS_TOKEN?.trim());
}

function dropboxToken() {
  const token = process.env.DROPBOX_ACCESS_TOKEN?.trim();
  if (!token) {
    throw new AppError(
      ErrorCodes.DROPBOX_NOT_CONFIGURED,
      "Add DROPBOX_ACCESS_TOKEN on the Railway app service, then try again.",
    );
  }
  return token;
}

export type DropboxListedFile = {
  id: string;
  name: string;
  path: string;
  folder: string;
};

type ListEntry = {
  ".tag"?: string;
  id?: string;
  name?: string;
  path_display?: string;
  path_lower?: string;
};

export function parseDropboxScanSource(raw: string): { folderPath?: string; folderUrl?: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { folderPath: "" };

  const share = normalizeDropboxUrl(trimmed);
  if (share) return { folderUrl: share };

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      if (url.hostname.toLowerCase().includes("dropbox.com")) {
        const stripped = url.pathname.replace(/^\/(home|work)/i, "");
        return { folderPath: decodeURIComponent(stripped) };
      }
    } catch {
      throw new AppError(ErrorCodes.VALIDATION, "That Dropbox location could not be parsed.");
    }
    throw new AppError(ErrorCodes.VALIDATION, "Paste a Dropbox folder path or shared folder link.");
  }

  return { folderPath: trimmed.startsWith("/") ? trimmed : `/${trimmed}` };
}

export async function listDropboxFiles(input: { folderPath?: string; folderUrl?: string }) {
  const sharedUrl = input.folderUrl ? normalizeDropboxUrl(input.folderUrl) : null;
  const folderPath = normalizeFolderPath(input.folderPath) ?? "";

  const files: DropboxListedFile[] = [];
  let cursor: string | null = null;
  let hasMore = true;

  type ListFolderResponse = {
    entries?: ListEntry[];
    cursor?: string;
    has_more?: boolean;
  };

  while (hasMore) {
    const payload: Record<string, unknown> = cursor
      ? { cursor }
      : sharedUrl
        ? {
            path: folderPath,
            recursive: true,
            include_non_downloadable_files: false,
            shared_link: { url: sharedUrl },
          }
        : {
            path: folderPath,
            recursive: true,
            include_non_downloadable_files: false,
          };

    const data: ListFolderResponse = await dropboxJson<ListFolderResponse>(
      cursor ? "/files/list_folder/continue" : "/files/list_folder",
      payload,
    );

    for (const entry of data.entries ?? []) {
      if (entry[".tag"] !== "file" || !entry.name) continue;
      const path = entry.path_display || entry.path_lower || entry.name;
      files.push({
        id: entry.id || path,
        name: entry.name,
        path,
        folder: folderName(path),
      });
    }

    cursor = data.cursor ?? null;
    hasMore = Boolean(data.has_more && cursor);
  }

  return { files, sharedUrl };
}

export async function downloadDropboxFile(input: {
  id?: string;
  path: string;
  sharedUrl?: string | null;
}) {
  const arg = input.sharedUrl
    ? { url: input.sharedUrl, path: input.path.startsWith("/") ? input.path : `/${input.path}` }
    : input.id?.startsWith("id:")
      ? { path: input.id }
      : { path: input.path };

  const response = await fetch(`${CONTENT}/files/download`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${dropboxToken()}`,
      "Dropbox-API-Arg": JSON.stringify(arg),
    },
  });

  if (!response.ok) {
    throw new AppError(ErrorCodes.INGEST_FAILED, await dropboxErrorMessage(response));
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length === 0) {
    throw new AppError(ErrorCodes.INGEST_FAILED, `Dropbox returned an empty file for ${input.path}.`);
  }

  const metaHeader = response.headers.get("dropbox-api-result");
  let name = input.path.split("/").filter(Boolean).at(-1) || "document";
  try {
    if (metaHeader) {
      const meta = JSON.parse(metaHeader) as { name?: string };
      if (meta.name) name = meta.name;
    }
  } catch {
    // keep path-derived name
  }

  return { bytes, name, contentType: response.headers.get("content-type") ?? "" };
}

export async function ensureDropboxSharedLink(path: string) {
  for (const visibility of ["public", "team_only"] as const) {
    try {
      const created = await dropboxJson<{ url?: string }>("/sharing/create_shared_link_with_settings", {
        path,
        settings: {
          access: { ".tag": "viewer" },
          audience: { ".tag": visibility === "public" ? "public" : "team" },
          requested_visibility: { ".tag": visibility },
        },
      });
      if (created.url) return created.url;
    } catch {
      // try the next visibility or existing links
    }
  }

  try {
    const existing = await dropboxJson<{ links?: { url?: string }[] }>("/sharing/list_shared_links", {
      path,
      direct_only: true,
    });
    const url = existing.links?.find((link) => link.url)?.url;
    if (url) return url;
  } catch {
    // fall through
  }

  return null;
}

function normalizeFolderPath(input?: string) {
  const raw = input?.trim();
  if (!raw) return null;
  if (raw === "/") return "";
  return raw.startsWith("/") ? raw : `/${raw}`;
}

function folderName(path: string) {
  const parts = path.split("/").filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 2] : "";
}

async function dropboxJson<T>(pathname: string, body: unknown): Promise<T> {
  const response = await fetch(`${API}${pathname}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${dropboxToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new AppError(ErrorCodes.INGEST_FAILED, await dropboxErrorMessage(response));
  }
  if (response.status === 204) return {} as T;
  return (await response.json()) as T;
}

async function dropboxErrorMessage(response: Response) {
  const text = await response.text();
  try {
    const parsed = JSON.parse(text) as { error_summary?: string; error?: { ".tag"?: string } };
    return parsed.error_summary || parsed.error?.[".tag"] || `Dropbox request failed (${response.status}).`;
  } catch {
    return text.slice(0, 300) || `Dropbox request failed (${response.status}).`;
  }
}
