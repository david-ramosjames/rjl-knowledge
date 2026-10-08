"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { generateArticleFromDocument } from "@/lib/ai/article";
import { requireAdmin } from "@/lib/auth/admin";
import { createArticleRecord, findArticleByImportKey, listArticleImportKeys } from "@/lib/db/articles";
import {
  downloadDropboxFile,
  ensureDropboxSharedLink,
  listDropboxFiles,
  parseDropboxScanSource,
} from "@/lib/dropbox/client";
import { isImportableDocumentName, toImportFile, type DropboxImportFile } from "@/lib/dropbox/import";
import { ingestFileBuffer } from "@/lib/ingest/document";
import { AppError } from "@/lib/errors";

export type { DropboxImportFile };

export type ScanDropboxResult =
  | { ok: true; files: DropboxImportFile[]; scanned: number }
  | { ok: false; message: string };

export type ImportDropboxResult =
  | { status: "imported"; slug: string; title: string }
  | { status: "skipped"; reason: string }
  | { status: "failed"; message: string };

export async function scanDropboxFolderAction(source: string): Promise<ScanDropboxResult> {
  await requireAdmin();
  try {
    const parsed = parseDropboxScanSource(source);
    const listed = await listDropboxFiles(parsed);
    const keys = await listArticleImportKeys();
    const files = listed.files
      .filter((file) => isImportableDocumentName(file.name))
      .map((file) => toImportFile(file, listed.sharedUrl, keys))
      .sort((a, b) => {
        const folder = a.folder.localeCompare(b.folder);
        return folder !== 0 ? folder : a.name.localeCompare(b.name);
      });
    return { ok: true, files, scanned: listed.files.length };
  } catch (error) {
    unstable_rethrow(error);
    return {
      ok: false,
      message:
        error instanceof AppError
          ? error.message
          : "The hub could not list that Dropbox folder. Check the path or token and try again.",
    };
  }
}

export async function importDropboxFileAction(file: DropboxImportFile): Promise<ImportDropboxResult> {
  await requireAdmin();
  try {
    if (!file?.name || !file.path) {
      return { status: "failed", message: "That Dropbox file is missing a path." };
    }
    if (!isImportableDocumentName(file.name)) {
      return { status: "skipped", reason: "Not a PDF, Word, or text file." };
    }

    const existing = await findArticleByImportKey(file.name);
    if (existing) {
      return { status: "skipped", reason: `Already in the hub as “${existing.title}”.` };
    }

    const downloaded = await downloadDropboxFile({
      id: file.id,
      path: file.path,
      sharedUrl: file.sharedUrl,
    });
    const ingested = await ingestFileBuffer(downloaded.bytes, downloaded.name, downloaded.contentType);
    const titleHint = fileStemTitle(downloaded.name);
    const generated = await generateArticleFromDocument({
      title: titleHint,
      category: file.category,
      fileName: downloaded.name,
      sourceText: ingested.text,
    });

    const title = generated.title || titleHint || downloaded.name;
    const category = file.category || generated.category || "Other";
    const driveUrl =
      (await ensureDropboxSharedLink(file.id.startsWith("id:") ? file.id : file.path)) ??
      (file.path !== file.id ? await ensureDropboxSharedLink(file.path) : null);

    const article = await createArticleRecord({
      title,
      category,
      summary: generated.summary,
      body: generated.body,
      keyPoints: generated.keyPoints,
      keywords: generated.keywords,
      driveUrl,
      fileName: downloaded.name,
    });

    revalidatePath("/");
    revalidatePath("/search");
    revalidatePath("/documents");
    revalidatePath("/admin");
    revalidatePath("/admin/documents");
    return { status: "imported", slug: article.slug, title: article.title };
  } catch (error) {
    unstable_rethrow(error);
    return {
      status: "failed",
      message:
        error instanceof AppError
          ? error.message
          : error instanceof Error
            ? error.message
            : "That file could not be imported.",
    };
  }
}

function fileStemTitle(name: string) {
  return name
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
