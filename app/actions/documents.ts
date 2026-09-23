"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { generateArticleFromDocument } from "@/lib/ai/article";
import { createArticleRecord, deleteArticle } from "@/lib/db/articles";
import { googleDriveFileName, normalizeGoogleDriveUrl } from "@/lib/drive";
import { ingestDocumentSource } from "@/lib/ingest/document";
import { normalizeCategory } from "@/lib/categories";
import { AppError, ErrorCodes } from "@/lib/errors";

function documentErrorRedirect(code: string): never {
  redirect(`/admin/documents/new?error=${code}`);
}

export async function createDocumentArticleAction(formData: FormData) {
  const titleHint = String(formData.get("title") ?? "").trim();
  const categoryRaw = String(formData.get("category") ?? "").trim();
  const categoryHint = categoryRaw ? normalizeCategory(categoryRaw) : "";
  const driveUrlRaw = String(formData.get("driveUrl") ?? "").trim();
  const uploaded = formData.get("file");
  const file =
    uploaded instanceof File && uploaded.size > 0 ? uploaded : null;
  const pastedText = String(formData.get("sourceText") ?? "").trim();
  let fileName = googleDriveFileName(String(formData.get("fileName") ?? "")) ?? file?.name ?? null;

  const driveUrl = normalizeGoogleDriveUrl(driveUrlRaw);
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

export async function deleteArticleAction(formData: FormData) {
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
