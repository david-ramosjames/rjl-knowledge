import { AppError, ErrorCodes } from "@/lib/errors";
import { normalizeDropboxUrl } from "@/lib/file-links";

const API = "https://api.dropboxapi.com/2";
const CONTENT = "https://content.dropboxapi.com/2";
const TOKEN_URL = "https://api.dropbox.com/oauth2/token";

type CachedAccessToken = { token: string; expiresAt: number };

let cachedAccessToken: CachedAccessToken | null = null;
let pendingAccessToken: Promise<string> | null = null;

export function isDropboxConfigured() {
  if (process.env.DROPBOX_ACCESS_TOKEN?.trim()) return true;
  return Boolean(
    process.env.DROPBOX_APP_KEY?.trim() &&
      process.env.DROPBOX_APP_SECRET?.trim() &&
      process.env.DROPBOX_REFRESH_TOKEN?.trim(),
  );
}

export function defaultDropboxFolderPath() {
  return normalizeFolderPath(process.env.DROPBOX_CASES_ROOT) ?? "";
}

async function getDropboxAccessToken() {
  const staticToken = process.env.DROPBOX_ACCESS_TOKEN?.trim();
  if (staticToken) return staticToken;

  if (cachedAccessToken && Date.now() < cachedAccessToken.expiresAt - 60_000) {
    return cachedAccessToken.token;
  }
  if (pendingAccessToken) return pendingAccessToken;

  pendingAccessToken = refreshDropboxAccessToken().finally(() => {
    pendingAccessToken = null;
  });
  return pendingAccessToken;
}

async function refreshDropboxAccessToken() {
  const appKey = process.env.DROPBOX_APP_KEY?.trim();
  const appSecret = process.env.DROPBOX_APP_SECRET?.trim();
  const refreshToken = process.env.DROPBOX_REFRESH_TOKEN?.trim();
  if (!appKey || !appSecret || !refreshToken) {
    throw new AppError(
      ErrorCodes.DROPBOX_NOT_CONFIGURED,
      "Add DROPBOX_APP_KEY, DROPBOX_APP_SECRET, and DROPBOX_REFRESH_TOKEN on the Railway app service, then try again.",
    );
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: appKey,
    client_secret: appSecret,
  });

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    throw new AppError(
      ErrorCodes.DROPBOX_NOT_CONFIGURED,
      "Dropbox refused the refresh token. Check DROPBOX_APP_KEY, DROPBOX_APP_SECRET, and DROPBOX_REFRESH_TOKEN on Railway.",
    );
  }

  const parsed = (await response.json()) as { access_token?: string; expires_in?: number | string };
  if (!parsed.access_token) {
    throw new AppError(
      ErrorCodes.DROPBOX_NOT_CONFIGURED,
      "Dropbox did not return an access token. Check the Dropbox app credentials on Railway.",
    );
  }

  const expiresIn = Number(parsed.expires_in);
  cachedAccessToken = {
    token: parsed.access_token,
    expiresAt: Date.now() + (Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn * 1000 : 3_600_000),
  };
  return parsed.access_token;
}

async function dropboxAuthHeaders(extra: Record<string, string> = {}) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${await getDropboxAccessToken()}`,
    ...extra,
  };
  const namespaceId = process.env.DROPBOX_NAMESPACE_ID?.trim();
  if (namespaceId) {
    headers["Dropbox-API-Path-Root"] = JSON.stringify({
      ".tag": "namespace_id",
      namespace_id: namespaceId,
    });
  }
  return headers;
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

export function toNamespaceRelativePath(path: string) {
  let normalized = path.trim();
  if (!normalized) return defaultDropboxFolderPath();
  try {
    normalized = decodeURIComponent(normalized);
  } catch {
    // keep the raw path if it is not URI-encoded
  }
  if (!normalized.startsWith("/")) normalized = `/${normalized}`;

  const root = defaultDropboxFolderPath();
  if (!root) return normalized;

  const lower = normalized.toLowerCase();
  const rootLower = root.toLowerCase();
  const at = lower.indexOf(rootLower);
  if (at >= 0) {
    const sliced = normalized.slice(at);
    return sliced.startsWith("/") ? sliced : `/${sliced}`;
  }

  const parts = normalized.split("/").filter(Boolean);
  if (parts.length === 1) return `${root}/${parts[0]}`;
  return normalized;
}

export function parseDropboxScanSource(raw: string): { folderPath?: string; folderUrl?: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { folderPath: defaultDropboxFolderPath() };

  const share = normalizeDropboxUrl(trimmed);
  if (share) return { folderUrl: share };

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      if (url.hostname.toLowerCase().includes("dropbox.com")) {
        const stripped = url.pathname.replace(/^\/(home|work)/i, "");
        return { folderPath: toNamespaceRelativePath(stripped) };
      }
    } catch {
      throw new AppError(ErrorCodes.VALIDATION, "That Dropbox location could not be parsed.");
    }
    throw new AppError(ErrorCodes.VALIDATION, "Paste a Dropbox folder path or shared folder link.");
  }

  return { folderPath: toNamespaceRelativePath(trimmed) };
}

export async function listDropboxFiles(input: { folderPath?: string; folderUrl?: string }) {
  const sharedUrl = input.folderUrl ? normalizeDropboxUrl(input.folderUrl) : null;
  const folderPath = normalizeFolderPath(input.folderPath) ?? defaultDropboxFolderPath();

  const files: DropboxListedFile[] = [];
  const seen = new Set<string>();
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
      const key = (entry.id || path).toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
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
    headers: await dropboxAuthHeaders({
      "Dropbox-API-Arg": JSON.stringify(arg),
    }),
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
    headers: await dropboxAuthHeaders({
      "Content-Type": "application/json",
    }),
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
