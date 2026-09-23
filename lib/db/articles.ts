import { prisma } from "@/lib/db/prisma";
import { TopicStatus } from "@/lib/generated/prisma/client";
import { AppError, ErrorCodes } from "@/lib/errors";
import { buildSearchText, normalizeTitle, slugify, uniqueStrings } from "@/lib/utils";

async function uniqueArticleSlug(title: string) {
  const base = slugify(title);
  let slug = base;
  let suffix = 2;
  while (await prisma.article.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
  return slug;
}

export async function createArticleRecord(input: {
  title: string;
  category: string;
  summary: string;
  body: string;
  keyPoints: string[];
  keywords: string[];
  driveUrl: string;
  fileName?: string | null;
}) {
  const title = input.title.trim();
  if (!title) {
    throw new AppError(ErrorCodes.VALIDATION, "An article title is required.");
  }

  const keyPoints = uniqueStrings(input.keyPoints);
  const keywords = uniqueStrings(input.keywords);
  const summary = input.summary.trim();
  const body = input.body.trim();

  try {
    return await prisma.article.create({
      data: {
        title,
        slug: await uniqueArticleSlug(title),
        normalizedTitle: normalizeTitle(title),
        category: input.category.trim() || "Other",
        summary,
        body,
        keyPoints,
        keywords,
        searchText: buildSearchText({
          title,
          category: input.category,
          summary,
          keyPoints,
          keywords,
        }) + `\n${body}`,
        driveUrl: input.driveUrl,
        fileName: input.fileName?.trim() || null,
        status: TopicStatus.APPROVED,
      },
    });
  } catch {
    throw new AppError(ErrorCodes.DATABASE_FAILURE, "Could not save the article. Try again.", 500);
  }
}

export async function getArticleBySlug(slug: string) {
  return prisma.article.findUnique({ where: { slug } });
}

export async function listArticlesForAdmin() {
  return prisma.article.findMany({
    where: { status: TopicStatus.APPROVED },
    orderBy: [{ updatedAt: "desc" }, { title: "asc" }],
  });
}

export async function deleteArticle(articleId: string) {
  const article = await prisma.article.findUnique({ where: { id: articleId } });
  if (!article) {
    throw new AppError(ErrorCodes.NOT_FOUND, "Article not found.");
  }
  await prisma.article.delete({ where: { id: article.id } });
  return article;
}
