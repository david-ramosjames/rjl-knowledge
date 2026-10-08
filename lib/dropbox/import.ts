import { categoryFromDropboxPath } from "@/lib/categories";
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

export function isAlreadyImported(
  fileName: string,
  keys: { fileNames: string[]; titles: string[] },
) {
  const lower = fileName.trim().toLowerCase();
  if (lower && keys.fileNames.includes(lower)) return true;
  const stem = normalizeTitle(fileStem(fileName));
  return Boolean(stem && keys.titles.includes(stem));
}

export function toImportFile(
  file: { id: string; name: string; path: string; folder: string },
  sharedUrl: string | null,
  keys: { fileNames: string[]; titles: string[] },
): DropboxImportFile {
  return {
    ...file,
    category: categoryFromDropboxPath(file.path),
    sharedUrl,
    alreadyImported: isAlreadyImported(file.name, keys),
  };
}
