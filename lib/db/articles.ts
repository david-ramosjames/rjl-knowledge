import { prisma } from "@/lib/db/prisma";
import { TopicStatus } from "@/lib/generated/prisma/client";
import { AppError, ErrorCodes } from "@/lib/errors";
import { asLitEvents, asStringArray, buildSearchText, normalizeTitle, slugify, uniqueStrings } from "@/lib/utils";

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
  driveUrl?: string | null;
  fileName?: string | null;
  meetingId?: string | null;
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
        driveUrl: input.driveUrl?.trim() || null,
        fileName: input.fileName?.trim() || null,
        meetingId: input.meetingId ?? null,
        status: TopicStatus.APPROVED,
      },
    });
  } catch {
    throw new AppError(ErrorCodes.DATABASE_FAILURE, "Could not save the article. Try again.", 500);
  }
}

export async function updateArticleRecord(
  articleId: string,
  input: {
    summary: string;
    body: string;
    keyPoints: string[];
    keywords: string[];
    fileName?: string | null;
  },
) {
  const article = await prisma.article.findUnique({ where: { id: articleId } });
  if (!article) {
    throw new AppError(ErrorCodes.NOT_FOUND, "Article not found.");
  }

  const keyPoints = uniqueStrings(input.keyPoints);
  const keywords = uniqueStrings(input.keywords);
  const summary = input.summary.trim();
  const body = input.body.trim();
  if (!summary || !body) {
    throw new AppError(ErrorCodes.OPENAI_FAILURE, "The AI did not return a complete article.");
  }

  try {
    return await prisma.article.update({
      where: { id: article.id },
      data: {
        summary,
        body,
        keyPoints,
        keywords,
        fileName: input.fileName?.trim() || article.fileName,
        searchText:
          buildSearchText({
            title: article.title,
            category: article.category,
            summary,
            keyPoints,
            keywords,
          }) + `\n${body}`,
      },
    });
  } catch {
    throw new AppError(ErrorCodes.DATABASE_FAILURE, "Could not update the article. Try again.", 500);
  }
}

export async function upsertMeetingNoteArticle(input: {
  meetingId: string;
  title: string;
  summary: string;
  body: string;
  keyPoints: string[];
  keywords: string[];
  litEvents?: { attorney: string; caseName: string; nextStep: string }[];
}) {
  const title = input.title.trim();
  if (!title) {
    throw new AppError(ErrorCodes.VALIDATION, "An article title is required.");
  }

  const keyPoints = uniqueStrings(input.keyPoints);
  const keywords = uniqueStrings(input.keywords);
  const litEvents = (input.litEvents ?? []).filter(
    (row) => row.attorney.trim() && row.caseName.trim() && row.nextStep.trim(),
  );
  const summary = input.summary.trim();
  const body = input.body.trim();
  if (!summary || !body) {
    throw new AppError(ErrorCodes.OPENAI_FAILURE, "The AI did not return a complete Big Cases note.");
  }

  const trackerText = litEvents
    .map((row) => `${row.attorney} ${row.caseName} ${row.nextStep}`)
    .join("\n");
  const searchText =
    buildSearchText({
      title,
      category: "Big Cases",
      summary,
      keyPoints,
      keywords,
    }) + `\n${body}\n${trackerText}`;

  const existing = await prisma.article.findUnique({ where: { meetingId: input.meetingId } });

  try {
    if (existing) {
      return await prisma.article.update({
        where: { id: existing.id },
        data: {
          title,
          normalizedTitle: normalizeTitle(title),
          category: "Big Cases",
          summary,
          body,
          keyPoints,
          keywords,
          litEvents,
          searchText,
        },
      });
    }

    return await prisma.article.create({
      data: {
        title,
        slug: await uniqueArticleSlug(title),
        normalizedTitle: normalizeTitle(title),
        category: "Big Cases",
        summary,
        body,
        keyPoints,
        keywords,
        litEvents,
        searchText,
        meetingId: input.meetingId,
        status: TopicStatus.APPROVED,
      },
    });
  } catch {
    throw new AppError(ErrorCodes.DATABASE_FAILURE, "Could not save the Big Cases note. Try again.", 500);
  }
}

export async function updateArticleContent(
  articleId: string,
  input: {
    summary: string;
    body: string;
    keyPoints: string[];
    litEvents?: { attorney: string; caseName: string; nextStep: string }[];
  },
) {
  const article = await prisma.article.findUnique({ where: { id: articleId } });
  if (!article) {
    throw new AppError(ErrorCodes.NOT_FOUND, "Article not found.");
  }

  const summary = input.summary.trim();
  const body = input.body.trim();
  const keyPoints = uniqueStrings(input.keyPoints);
  const keywords = asStringArray(article.keywords);
  const litEvents = (input.litEvents ?? asLitEvents(article.litEvents)).filter(
    (row) => row.attorney.trim() && row.caseName.trim() && row.nextStep.trim(),
  );
  if (!summary || !body) {
    throw new AppError(ErrorCodes.VALIDATION, "Summary and article text are required.");
  }

  const trackerText = litEvents
    .map((row) => `${row.attorney} ${row.caseName} ${row.nextStep}`)
    .join("\n");

  try {
    return await prisma.article.update({
      where: { id: article.id },
      data: {
        summary,
        body,
        keyPoints,
        litEvents,
        searchText:
          buildSearchText({
            title: article.title,
            category: article.category,
            summary,
            keyPoints,
            keywords,
          }) + `\n${body}\n${trackerText}`,
      },
    });
  } catch {
    throw new AppError(ErrorCodes.DATABASE_FAILURE, "Could not save the article edits. Try again.", 500);
  }
}

export async function renameArticle(articleId: string, title: string) {
  const article = await prisma.article.findUnique({ where: { id: articleId } });
  if (!article) {
    throw new AppError(ErrorCodes.NOT_FOUND, "Article not found.");
  }

  const nextTitle = title.trim();
  if (!nextTitle) {
    throw new AppError(ErrorCodes.VALIDATION, "An article title is required.");
  }

  const keyPoints = asStringArray(article.keyPoints);
  const keywords = asStringArray(article.keywords);

  try {
    return await prisma.article.update({
      where: { id: article.id },
      data: {
        title: nextTitle,
        normalizedTitle: normalizeTitle(nextTitle),
        searchText:
          buildSearchText({
            title: nextTitle,
            category: article.category,
            summary: article.summary,
            keyPoints,
            keywords,
          }) + `\n${article.body}`,
      },
    });
  } catch {
    throw new AppError(ErrorCodes.DATABASE_FAILURE, "Could not rename the article. Try again.", 500);
  }
}

export async function getArticleBySlug(slug: string) {
  return prisma.article.findUnique({
    where: { slug },
    include: { meeting: true },
  });
}

export async function listPublishedArticles() {
  return prisma.article.findMany({
    where: { status: TopicStatus.APPROVED },
    orderBy: [{ updatedAt: "desc" }, { title: "asc" }],
  });
}

export async function listArticlesForAdmin() {
  return listPublishedArticles();
}

export async function deleteArticle(articleId: string) {
  const article = await prisma.article.findUnique({ where: { id: articleId } });
  if (!article) {
    throw new AppError(ErrorCodes.NOT_FOUND, "Article not found.");
  }
  await prisma.article.delete({ where: { id: article.id } });
  return article;
}
