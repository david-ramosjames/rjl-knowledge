"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { generateArticleFromIngested } from "@/lib/ai/article";
import { requireAdmin } from "@/lib/auth/admin";
import { createArticleRecord, findArticleByImportKey, listArticleImportKeys } from "@/lib/db/articles";
import {
  downloadDropboxFile,
  ensureDropboxSharedLink,
  listDropboxFiles,
  parseDropboxScanSource,
} from "@/lib/dropbox/client";
import { classifyDropboxFile } from "@/lib/dropbox/relevance";
import {
  dedupeImportFiles,
  isImportableDocumentName,
  toImportFile,
  type DropboxImportFile,
} from "@/lib/dropbox/import";
import { ingestFileBuffer } from "@/lib/ingest/document";
import { captureArticleThumbnail } from "@/lib/ingest/thumbnail";
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
    const files = dedupeImportFiles(
      listed.files
        .filter((file) => isImportableDocumentName(file.name))
        .map((file) => toImportFile(file, listed.sharedUrl, keys)),
    ).sort((a, b) => {
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

export async function importDropboxFileAction(
  file: DropboxImportFile,
  options?: { force?: boolean },
): Promise<ImportDropboxResult> {
  await requireAdmin();
  try {
    if (!file?.name || !file.path) {
      return { status: "failed", message: "That Dropbox file is missing a path." };
    }
    if (!isImportableDocumentName(file.name)) {
      return { status: "skipped", reason: "Not a PDF, Word, or text file." };
    }
    const classified = classifyDropboxFile(file);
    if (classified.relevance !== "knowledge" && !options?.force) {
      return {
        status: "skipped",
        reason: classified.skipReason || "Not a knowledge document.",
      };
    }

    const existing =
      (await findArticleByImportKey(file.name)) ??
      (file.path ? await findArticleByImportKey(file.path.split("/").filter(Boolean).at(-1) ?? "") : null);
    if (existing) {
      return { status: "skipped", reason: `Already in the hub as “${existing.title}”.` };
    }

    const downloaded = await downloadDropboxFile({
      id: file.id,
      path: file.path,
      sharedUrl: file.sharedUrl,
    });
    const existingByDownload = await findArticleByImportKey(downloaded.name);
    if (existingByDownload) {
      return { status: "skipped", reason: `Already in the hub as “${existingByDownload.title}”.` };
    }
    const ingested = await ingestFileBuffer(downloaded.bytes, downloaded.name, downloaded.contentType);
    const titleHint = fileStemTitle(downloaded.name);
    const generated = await generateArticleFromIngested({
      title: titleHint,
      category: file.category,
      fileName: downloaded.name,
      ingested,
    });

    const title = generated.title || titleHint || downloaded.name;
    const folderTopic = file.category || file.folder?.replace(/^\d+[\.\)\s_-]+/, "").trim();
    const category = folderTopic || generated.category || "Other";
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
    await captureArticleThumbnail({
      articleId: article.id,
      fileName: downloaded.name,
      driveUrl,
      dropboxPath: file.path,
      pages: ingested.pages,
      fileBytes: downloaded.bytes,
    });

    revalidatePath("/");
    revalidatePath("/search");
    revalidatePath("/documents");
    revalidatePath("/admin");
    revalidatePath("/admin/documents");
    return { status: "imported", slug: article.slug, title: article.title };
  } catch (error) {
    unstable_rethrow(error);
    const message =
      error instanceof AppError
        ? error.message
        : error instanceof Error
          ? error.message
          : "That file could not be imported.";
    const unreadable =
      error instanceof AppError &&
      /could not be read|could not read any text|larger than 12 MB|scanned images/i.test(error.message);
    if (unreadable) {
      return { status: "skipped", reason: message };
    }
    return { status: "failed", message };
  }
}

function fileStemTitle(name: string) {
  return name
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
