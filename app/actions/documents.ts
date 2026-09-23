"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { generateArticleFromDocument } from "@/lib/ai/article";
import { createArticleRecord, deleteArticle } from "@/lib/db/articles";
import { googleDriveFileName, normalizeGoogleDriveUrl } from "@/lib/drive";
import { normalizeCategory } from "@/lib/categories";
import { AppError, ErrorCodes } from "@/lib/errors";

function documentErrorRedirect(code: string): never {
  redirect(`/admin/documents/new?error=${code}`);
}

export async function createDocumentArticleAction(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const category = normalizeCategory(String(formData.get("category") ?? ""));
  const driveUrlRaw = String(formData.get("driveUrl") ?? "").trim();
  const fileName = googleDriveFileName(String(formData.get("fileName") ?? ""));
  const sourceText = String(formData.get("sourceText") ?? "").trim();
  const articleBody = String(formData.get("articleBody") ?? "").trim();

  if (!title) documentErrorRedirect(ErrorCodes.VALIDATION);
  const driveUrl = normalizeGoogleDriveUrl(driveUrlRaw);
  if (!driveUrl) documentErrorRedirect(ErrorCodes.INVALID_DRIVE_URL);
  if (!sourceText && !articleBody) documentErrorRedirect(ErrorCodes.MISSING_TRANSCRIPT);

  let summary = articleBody ? articleBody.slice(0, 400) : "";
  let body = articleBody;
  let keyPoints: string[] = [];
  let keywords: string[] = [];
  let publishedTitle = title;
  let publishedCategory = category;

  if (!body && sourceText) {
    try {
      const generated = await generateArticleFromDocument({
        title,
        category,
        fileName,
        sourceText,
      });
      publishedTitle = generated.title || title;
      publishedCategory = generated.category || category;
      summary = generated.summary;
      body = generated.body;
      keyPoints = generated.keyPoints;
      keywords = generated.keywords;
    } catch (error) {
      unstable_rethrow(error);
      if (error instanceof AppError && error.code === ErrorCodes.OPENAI_FAILURE) {
        body = sourceText;
        summary = sourceText.slice(0, 400);
      } else {
        documentErrorRedirect(error instanceof AppError ? error.code : ErrorCodes.OPENAI_FAILURE);
      }
    }
  }

  if (!body) documentErrorRedirect(ErrorCodes.VALIDATION);
  if (!summary) summary = body.slice(0, 400);

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
