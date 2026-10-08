import { categoryFromDropboxPath } from "@/lib/categories";
import { classifyDropboxFile, type DropboxRelevance } from "@/lib/dropbox/relevance";
import { normalizeTitle } from "@/lib/utils";

export const IMPORTABLE_EXTENSIONS = [".pdf", ".docx", ".txt", ".md", ".csv", ".json"] as const;

export type DropboxImportFile = {
  id: string;
  name: string;
  path: string;
  folder: string;
  category: string;
  sharedUrl: string | null;
  alreadyImported: boolean;
  relevance: DropboxRelevance;
  skipReason?: string;
};

export function isImportableDocumentName(name: string) {
  const lower = name.toLowerCase();
  if (!lower || lower.startsWith(".") || lower.startsWith("~$") || lower === "thumbs.db") {
    return false;
  }
  return IMPORTABLE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function fileStem(name: string) {
  return name.replace(/\.[^.]+$/, "");
}

export function fileKeyVariants(fileName: string) {
  const lower = fileName.trim().toLowerCase();
  const stem = fileStem(lower);
  const stripped = stem.replace(/^\d+[\.\)\s_-]+/, "").trim();
  return [
    lower,
    stem,
    stripped,
    normalizeTitle(stem),
    normalizeTitle(stripped),
  ].filter(Boolean);
}

export function isAlreadyImported(
  fileName: string,
  keys: { fileNames: string[]; titles: string[] },
) {
  const incoming = new Set(fileKeyVariants(fileName));
  if (incoming.size === 0) return false;
  for (const existing of keys.fileNames) {
    for (const variant of fileKeyVariants(existing)) {
      if (incoming.has(variant)) return true;
    }
  }
  for (const title of keys.titles) {
    if (incoming.has(title)) return true;
  }
  return false;
}

export function toImportFile(
  file: { id: string; name: string; path: string; folder: string },
  sharedUrl: string | null,
  keys: { fileNames: string[]; titles: string[] },
): DropboxImportFile {
  const alreadyImported = isAlreadyImported(file.name, keys);
  if (alreadyImported) {
    return {
      ...file,
      category: categoryFromDropboxPath(file.path),
      sharedUrl,
      alreadyImported: true,
      relevance: "skip",
      skipReason: "Already in the hub.",
    };
  }
  const classified = classifyDropboxFile(file);
  return {
    ...file,
    category: categoryFromDropboxPath(file.path),
    sharedUrl,
    alreadyImported: false,
    relevance: classified.relevance,
    skipReason: classified.skipReason,
  };
}

export function dedupeImportFiles(files: DropboxImportFile[]) {
  const byId = new Map<string, DropboxImportFile>();
  for (const file of files) {
    const key = (file.id || file.path).toLowerCase();
    if (!byId.has(key)) byId.set(key, file);
  }

  const groups = new Map<string, DropboxImportFile[]>();
  for (const file of byId.values()) {
    const key = `${file.folder.toLowerCase()}::${normalizeTitle(fileStem(file.name))}`;
    const group = groups.get(key) ?? [];
    group.push(file);
    groups.set(key, group);
  }

  const kept: DropboxImportFile[] = [];
  for (const group of groups.values()) {
    const docx = group.find((file) => file.name.toLowerCase().endsWith(".docx"));
    kept.push(docx ?? group[0]);
  }
  return kept;
}
