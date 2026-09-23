"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { generateArticleFromDocument } from "@/lib/ai/article";
import { requireAdmin } from "@/lib/auth/admin";
import { processMeeting } from "@/lib/ai/process-meeting";
import {
  createArticleRecord,
  deleteArticle,
  renameArticle,
  updateArticleContent,
  updateArticleRecord,
} from "@/lib/db/articles";
import { prisma } from "@/lib/db/prisma";
import { fileNameFromShareUrl, normalizeFileShareUrl, optionalFileName } from "@/lib/file-links";
import { ingestDocumentSource } from "@/lib/ingest/document";
import { normalizeCategory } from "@/lib/categories";
import { AppError, ErrorCodes } from "@/lib/errors";

function documentErrorRedirect(code: string): never {
  redirect(`/admin/documents/new?error=${code}`);
}

export async function createDocumentArticleAction(formData: FormData) {
  await requireAdmin();
  const titleHint = String(formData.get("title") ?? "").trim();
  const categoryRaw = String(formData.get("category") ?? "").trim();
  const categoryHint = categoryRaw ? normalizeCategory(categoryRaw) : "";
  const driveUrlRaw = String(formData.get("driveUrl") ?? "").trim();
  const uploaded = formData.get("file");
  const file =
    uploaded instanceof File && uploaded.size > 0 ? uploaded : null;
  const pastedText = String(formData.get("sourceText") ?? "").trim();
  let fileName =
    optionalFileName(String(formData.get("fileName") ?? "")) ??
    file?.name ??
    fileNameFromShareUrl(driveUrlRaw);

  const driveUrl = normalizeFileShareUrl(driveUrlRaw);
  if (!driveUrl) documentErrorRedirect(ErrorCodes.INVALID_DRIVE_URL);

  let ingestedText = "";
  try {
    const ingested = await ingestDocumentSource({
      driveUrl,
      uploaded: file,
      pastedText,
    });
    ingestedText = ingested.text;
    fileName = fileName ?? ingested.fileName ?? null;
  } catch (error) {
    unstable_rethrow(error);
    documentErrorRedirect(error instanceof AppError ? error.code : ErrorCodes.INGEST_FAILED);
  }

  if (!ingestedText.trim()) documentErrorRedirect(ErrorCodes.INGEST_FAILED);

  let publishedTitle = titleHint;
  let publishedCategory = categoryHint || "Firm Guides";
  let summary = "";
  let body = "";
  let keyPoints: string[] = [];
  let keywords: string[] = [];

  try {
    const generated = await generateArticleFromDocument({
      title: titleHint,
      category: categoryHint,
      fileName,
      sourceText: ingestedText,
    });
    publishedTitle = generated.title || titleHint || fileName || "Firm document";
    publishedCategory = generated.category || publishedCategory;
    summary = generated.summary;
    body = generated.body;
    keyPoints = generated.keyPoints;
    keywords = generated.keywords;
  } catch (error) {
    unstable_rethrow(error);
    documentErrorRedirect(error instanceof AppError ? error.code : ErrorCodes.OPENAI_FAILURE);
  }

  if (!body) documentErrorRedirect(ErrorCodes.OPENAI_FAILURE);

  let slug = "";
  try {
    const article = await createArticleRecord({
      title: publishedTitle,
      category: publishedCategory,
      summary,
      body,
      keyPoints,
      keywords,
      driveUrl,
      fileName,
    });
    slug = article.slug;
  } catch (error) {
    unstable_rethrow(error);
    documentErrorRedirect(error instanceof AppError ? error.code : ErrorCodes.DATABASE_FAILURE);
  }

  revalidatePath("/");
  revalidatePath("/search");
  revalidatePath("/admin");
  revalidatePath("/admin/documents");
  redirect(`/articles/${slug}`);
}

export async function refreshArticleAction(formData: FormData) {
  await requireAdmin();
  const articleId = String(formData.get("articleId") ?? "").trim();
  const uploaded = formData.get("file");
  const file = uploaded instanceof File && uploaded.size > 0 ? uploaded : null;
  if (!articleId) redirect("/admin/documents");

  const article = await prisma.article.findUnique({ where: { id: articleId } });
  if (!article) redirect("/admin/documents?error=refresh");

  if (article.meetingId) {
    try {
      await processMeeting(article.meetingId, { force: true });
    } catch (error) {
      unstable_rethrow(error);
      redirect(`/articles/${article.slug}?error=refresh`);
    }
    revalidatePath("/");
    revalidatePath("/search");
    revalidatePath("/admin");
    revalidatePath("/admin/documents");
    revalidatePath(`/articles/${article.slug}`);
    redirect(`/articles/${article.slug}`);
  }

  let ingestedText = "";
  let fileName = article.fileName;
  try {
    const ingested = await ingestDocumentSource({
      driveUrl: article.driveUrl ?? "",
      uploaded: file,
    });
    ingestedText = ingested.text;
    fileName = fileName ?? ingested.fileName ?? null;
  } catch (error) {
    unstable_rethrow(error);
    redirect(`/articles/${article.slug}?error=ingest`);
  }

  if (!ingestedText.trim()) redirect(`/articles/${article.slug}?error=ingest`);

  try {
    const generated = await generateArticleFromDocument({
      title: article.title,
      category: article.category,
      fileName,
      sourceText: ingestedText,
    });
    await updateArticleRecord(article.id, {
      summary: generated.summary,
      body: generated.body,
      keyPoints: generated.keyPoints,
      keywords: generated.keywords,
      fileName,
    });
  } catch (error) {
    unstable_rethrow(error);
    redirect(`/articles/${article.slug}?error=refresh`);
  }

  revalidatePath("/");
  revalidatePath("/search");
  revalidatePath("/admin");
  revalidatePath("/admin/documents");
  revalidatePath(`/articles/${article.slug}`);
  redirect(`/articles/${article.slug}`);
}

export async function renameArticleAction(formData: FormData) {
  await requireAdmin();
  const articleId = String(formData.get("articleId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const returnTo = String(formData.get("returnTo") ?? "").trim();
  if (!articleId) redirect("/admin/documents");

  const existing = await prisma.article.findUnique({ where: { id: articleId } });
  if (!existing) redirect("/admin/documents?error=rename");

  if (!title) {
    redirect(
      returnTo.startsWith("/articles/")
        ? `${returnTo.split("?")[0]}?error=rename`
        : "/admin/documents?error=rename",
    );
  }

  try {
    await renameArticle(articleId, title);
  } catch (error) {
    unstable_rethrow(error);
    redirect(
      returnTo.startsWith("/articles/")
        ? `/articles/${existing.slug}?error=rename`
        : "/admin/documents?error=rename",
    );
  }

  revalidatePath("/");
  revalidatePath("/search");
  revalidatePath("/admin");
  revalidatePath("/admin/documents");
  revalidatePath(`/articles/${existing.slug}`);
  redirect(returnTo.startsWith("/articles/") ? `/articles/${existing.slug}` : "/admin/documents");
}

function parseLitEventLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      const parts = line.split("|").map((part) => part.trim());
      if (parts.length < 3) return [];
      const [attorney, caseName, ...rest] = parts;
      const nextStep = rest.join(" | ").trim();
      if (!attorney || !caseName || !nextStep) return [];
      return [{ attorney, caseName, nextStep }];
    });
}

export async function editArticleAction(formData: FormData) {
  await requireAdmin();
  const articleId = String(formData.get("articleId") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const keyPoints = String(formData.get("keyPoints") ?? "")
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-•]\s*/, "").trim())
    .filter(Boolean);

  const existing = await prisma.article.findUnique({ where: { id: articleId } });
  if (!existing) redirect("/admin/documents?error=edit");

  try {
    await updateArticleContent(articleId, {
      summary,
      body,
      keyPoints,
      litEvents: parseLitEventLines(String(formData.get("litEvents") ?? "")),
    });
  } catch (error) {
    unstable_rethrow(error);
    redirect(`/articles/${existing.slug}?error=edit`);
  }

  revalidatePath("/");
  revalidatePath("/search");
  revalidatePath("/admin");
  revalidatePath("/admin/documents");
  revalidatePath(`/articles/${existing.slug}`);
  redirect(`/articles/${existing.slug}`);
}

export async function deleteArticleAction(formData: FormData) {
  await requireAdmin();
  const articleId = String(formData.get("articleId") ?? "").trim();
  if (!articleId) redirect("/admin/documents");

  let slug = "";
  try {
    const article = await deleteArticle(articleId);
    slug = article.slug;
  } catch (error) {
    unstable_rethrow(error);
    redirect("/admin/documents?error=delete");
  }

  revalidatePath("/");
  revalidatePath("/search");
  revalidatePath("/admin");
  revalidatePath("/admin/documents");
  if (slug) revalidatePath(`/articles/${slug}`);
  redirect("/admin/documents");
}
