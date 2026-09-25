// V1 search uses Postgres ILIKE plus tsvector ranking.
// Keep this module as the only search entry point so semantic/pgvector
// ranking can be added later without changing page contracts.
import { prisma } from "@/lib/db/prisma";
import { Prisma, TopicStatus } from "@/lib/generated/prisma/client";
import { articleKindLabel } from "@/lib/meetings/kinds";

function articleKindMeta(category: string, fileName?: string | null) {
  const label = articleKindLabel({ category });
  return label !== "Document" ? label : fileName || "Document";
}

export type KnowledgeKind = "topic" | "article";

export type KnowledgeSearchResult = {
  id: string;
  kind: KnowledgeKind;
  title: string;
  slug: string;
  href: string;
  category: string;
  summary: string;
  lastDiscussedAt: Date | null;
  meta?: string;
  rank: number;
};

type SearchRow = {
  id: string;
  title: string;
  slug: string;
  category: string;
  summary: string;
  lastDiscussedAt: Date | null;
  discussionCount: bigint | number;
  rank: number;
};

type ArticleSearchRow = {
  id: string;
  title: string;
  slug: string;
  category: string;
  summary: string;
  updatedAt: Date;
  fileName: string | null;
  rank: number;
};

export async function searchKnowledge(
  query: string,
  options?: { category?: string },
): Promise<KnowledgeSearchResult[]> {
  const q = query.trim();
  const category = options?.category?.trim();

  if (!q && !category) return [];

  const [topics, articles] = await Promise.all([
    queryTopics(q, category),
    queryArticles(q, category),
  ]);

  return [...topics, ...articles].sort((a, b) => {
    if (b.rank !== a.rank) return b.rank - a.rank;
    const aDate = a.lastDiscussedAt?.getTime() ?? 0;
    const bDate = b.lastDiscussedAt?.getTime() ?? 0;
    return bDate - aDate;
  });
}

async function queryTopics(q: string, category?: string): Promise<KnowledgeSearchResult[]> {
  if (!q && category) {
    const topics = await prisma.topic.findMany({
      where: {
        status: TopicStatus.APPROVED,
        category,
      },
      include: {
        _count: { select: { discussions: true } },
      },
      orderBy: [{ lastDiscussedAt: "desc" }, { updatedAt: "desc" }],
    });

    return topics.map((topic) => ({
      id: topic.id,
      kind: "topic" as const,
      title: topic.title,
      slug: topic.slug,
      href: `/topics/${topic.slug}`,
      category: topic.category,
      summary: topic.summary,
      lastDiscussedAt: topic.lastDiscussedAt,
      meta: `${topic._count.discussions} source${topic._count.discussions === 1 ? "" : "s"}`,
      rank: 1,
    }));
  }

  const prefix = `${q}%`;
  const contains = `%${q}%`;

  const rows = await prisma.$queryRaw<SearchRow[]>(Prisma.sql`
    SELECT
      t.id,
      t.title,
      t.slug,
      t.category,
      t.summary,
      t."lastDiscussedAt",
      (
        SELECT COUNT(*)::int FROM "Discussion" d WHERE d."topicId" = t.id
      ) AS "discussionCount",
      (
        CASE
          WHEN lower(t.title) = lower(${q}) THEN 100
          WHEN t.title ILIKE ${prefix} THEN 80
          WHEN t.title ILIKE ${contains} THEN 55
          WHEN t.category ILIKE ${contains} THEN 40
          ELSE 0
        END
        + CASE WHEN t."searchText" ILIKE ${contains} THEN 12 ELSE 0 END
        + CASE
            WHEN to_tsvector('english', t."searchText") @@ websearch_to_tsquery('english', ${q})
            THEN ts_rank(to_tsvector('english', t."searchText"), websearch_to_tsquery('english', ${q})) * 25
            ELSE 0
          END
      ) AS rank
    FROM "Topic" t
    WHERE t.status = 'APPROVED'
      ${category ? Prisma.sql`AND t.category = ${category}` : Prisma.empty}
      AND (
        t.title ILIKE ${contains}
        OR t.category ILIKE ${contains}
        OR t.summary ILIKE ${contains}
        OR t."searchText" ILIKE ${contains}
        OR to_tsvector('english', t."searchText") @@ websearch_to_tsquery('english', ${q})
      )
    ORDER BY rank DESC, t."lastDiscussedAt" DESC NULLS LAST, t."updatedAt" DESC
    LIMIT 50
  `);

  return rows.map((row) => ({
    id: row.id,
    kind: "topic" as const,
    title: row.title,
    slug: row.slug,
    href: `/topics/${row.slug}`,
    category: row.category,
    summary: row.summary,
    lastDiscussedAt: row.lastDiscussedAt,
    meta: `${Number(row.discussionCount)} source${Number(row.discussionCount) === 1 ? "" : "s"}`,
    rank: Number(row.rank),
  }));
}

async function queryArticles(q: string, category?: string): Promise<KnowledgeSearchResult[]> {
  if (!q && category) {
    const articles = await prisma.article.findMany({
      where: {
        status: TopicStatus.APPROVED,
        category,
      },
      orderBy: { updatedAt: "desc" },
    });

    return articles.map((article) => ({
      id: article.id,
      kind: "article" as const,
      title: article.title,
      slug: article.slug,
      href: `/articles/${article.slug}`,
      category: article.category,
      summary: article.summary,
      lastDiscussedAt: article.updatedAt,
      meta: articleKindMeta(article.category, article.fileName),
      rank: 1,
    }));
  }

  const prefix = `${q}%`;
  const contains = `%${q}%`;

  const rows = await prisma.$queryRaw<ArticleSearchRow[]>(Prisma.sql`
    SELECT
      a.id,
      a.title,
      a.slug,
      a.category,
      a.summary,
      a."updatedAt",
      a."fileName",
      (
        CASE
          WHEN lower(a.title) = lower(${q}) THEN 100
          WHEN a.title ILIKE ${prefix} THEN 80
          WHEN a.title ILIKE ${contains} THEN 55
          WHEN a.category ILIKE ${contains} THEN 40
          ELSE 0
        END
        + CASE WHEN a."searchText" ILIKE ${contains} THEN 12 ELSE 0 END
        + CASE
            WHEN to_tsvector('english', a."searchText") @@ websearch_to_tsquery('english', ${q})
            THEN ts_rank(to_tsvector('english', a."searchText"), websearch_to_tsquery('english', ${q})) * 25
            ELSE 0
          END
      ) AS rank
    FROM "Article" a
    WHERE a.status = 'APPROVED'
      ${category ? Prisma.sql`AND a.category = ${category}` : Prisma.empty}
      AND (
        a.title ILIKE ${contains}
        OR a.category ILIKE ${contains}
        OR a.summary ILIKE ${contains}
        OR a.body ILIKE ${contains}
        OR a."searchText" ILIKE ${contains}
        OR to_tsvector('english', a."searchText") @@ websearch_to_tsquery('english', ${q})
      )
    ORDER BY rank DESC, a."updatedAt" DESC
    LIMIT 50
  `);

  return rows.map((row) => ({
    id: row.id,
    kind: "article" as const,
    title: row.title,
    slug: row.slug,
    href: `/articles/${row.slug}`,
    category: row.category,
    summary: row.summary,
    lastDiscussedAt: row.updatedAt,
    meta: articleKindMeta(row.category, row.fileName),
    rank: Number(row.rank),
  }));
}

export async function getRecentKnowledge(limit = 6): Promise<KnowledgeSearchResult[]> {
  const [topics, articles] = await Promise.all([
    prisma.topic.findMany({
      where: { status: TopicStatus.APPROVED },
      include: {
        _count: { select: { discussions: true } },
      },
      orderBy: [{ lastDiscussedAt: "desc" }, { updatedAt: "desc" }],
      take: limit,
    }),
    prisma.article.findMany({
      where: { status: TopicStatus.APPROVED },
      orderBy: { updatedAt: "desc" },
      take: limit,
    }),
  ]);

  return [
    ...topics.map((topic) => ({
      id: topic.id,
      kind: "topic" as const,
      title: topic.title,
      slug: topic.slug,
      href: `/topics/${topic.slug}`,
      category: topic.category,
      summary: topic.summary,
      lastDiscussedAt: topic.lastDiscussedAt ?? topic.updatedAt,
      meta: `${topic._count.discussions} source${topic._count.discussions === 1 ? "" : "s"}`,
      rank: 1,
    })),
    ...articles.map((article) => ({
      id: article.id,
      kind: "article" as const,
      title: article.title,
      slug: article.slug,
      href: `/articles/${article.slug}`,
      category: article.category,
      summary: article.summary,
      lastDiscussedAt: article.updatedAt,
      meta: articleKindMeta(article.category, article.fileName),
      rank: 1,
    })),
  ]
    .sort((a, b) => (b.lastDiscussedAt?.getTime() ?? 0) - (a.lastDiscussedAt?.getTime() ?? 0))
    .slice(0, limit);
}

export async function getRelatedKnowledge({
  category,
  excludeId,
  excludeKind,
  limit = 4,
}: {
  category: string;
  excludeId: string;
  excludeKind: KnowledgeKind;
  limit?: number;
}): Promise<KnowledgeSearchResult[]> {
  const [topics, articles] = await Promise.all([
    prisma.topic.findMany({
      where: {
        status: TopicStatus.APPROVED,
        category,
        ...(excludeKind === "topic" ? { id: { not: excludeId } } : {}),
      },
      include: {
        _count: { select: { discussions: true } },
      },
      orderBy: [{ lastDiscussedAt: "desc" }, { updatedAt: "desc" }],
      take: limit,
    }),
    prisma.article.findMany({
      where: {
        status: TopicStatus.APPROVED,
        category,
        ...(excludeKind === "article" ? { id: { not: excludeId } } : {}),
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
    }),
  ]);

  return [
    ...topics.map((topic) => ({
      id: topic.id,
      kind: "topic" as const,
      title: topic.title,
      slug: topic.slug,
      href: `/topics/${topic.slug}`,
      category: topic.category,
      summary: topic.summary,
      lastDiscussedAt: topic.lastDiscussedAt ?? topic.updatedAt,
      meta: `${topic._count.discussions} source${topic._count.discussions === 1 ? "" : "s"}`,
      rank: 1,
    })),
    ...articles.map((article) => ({
      id: article.id,
      kind: "article" as const,
      title: article.title,
      slug: article.slug,
      href: `/articles/${article.slug}`,
      category: article.category,
      summary: article.summary,
      lastDiscussedAt: article.updatedAt,
      meta: articleKindMeta(article.category, article.fileName),
      rank: 1,
    })),
  ]
    .sort((a, b) => (b.lastDiscussedAt?.getTime() ?? 0) - (a.lastDiscussedAt?.getTime() ?? 0))
    .slice(0, limit);
}

export async function getUsedCategories() {
  const [topicGroups, articleGroups] = await Promise.all([
    prisma.topic.groupBy({
      by: ["category"],
      where: { status: TopicStatus.APPROVED },
      _count: { _all: true },
    }),
    prisma.article.groupBy({
      by: ["category"],
      where: { status: TopicStatus.APPROVED },
      _count: { _all: true },
    }),
  ]);

  const counts = new Map<string, number>();
  for (const item of [...topicGroups, ...articleGroups]) {
    counts.set(item.category, (counts.get(item.category) ?? 0) + item._count._all);
  }

  return [...counts.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => a.category.localeCompare(b.category));
}

/** @deprecated Use searchKnowledge */
export const searchTopics = searchKnowledge;
/** @deprecated Use getRecentKnowledge */
export const getRecentTopics = getRecentKnowledge;
