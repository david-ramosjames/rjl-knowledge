// V1 search uses Postgres ILIKE plus tsvector ranking.
// Keep this module as the only search entry point so semantic/pgvector
// ranking can be added later without changing page contracts.
import { prisma } from "@/lib/db/prisma";
import { Prisma, TopicStatus } from "@/lib/generated/prisma/client";

export type TopicSearchResult = {
  id: string;
  title: string;
  slug: string;
  category: string;
  summary: string;
  discussionCount: number;
  lastDiscussedAt: Date | null;
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

export async function searchTopics(query: string, options?: { category?: string }): Promise<TopicSearchResult[]> {
  const q = query.trim();
  const category = options?.category?.trim();

  if (!q && !category) return [];

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
      title: topic.title,
      slug: topic.slug,
      category: topic.category,
      summary: topic.summary,
      discussionCount: topic._count.discussions,
      lastDiscussedAt: topic.lastDiscussedAt,
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
    title: row.title,
    slug: row.slug,
    category: row.category,
    summary: row.summary,
    discussionCount: Number(row.discussionCount),
    lastDiscussedAt: row.lastDiscussedAt,
    rank: Number(row.rank),
  }));
}

export async function getRecentTopics(limit = 6) {
  return prisma.topic.findMany({
    where: { status: TopicStatus.APPROVED },
    include: {
      _count: { select: { discussions: true } },
    },
    orderBy: [{ lastDiscussedAt: "desc" }, { updatedAt: "desc" }],
    take: limit,
  });
}

export async function getUsedCategories() {
  const grouped = await prisma.topic.groupBy({
    by: ["category"],
    where: { status: TopicStatus.APPROVED },
    _count: { _all: true },
    orderBy: { category: "asc" },
  });

  return grouped.map((item) => ({
    category: item.category,
    count: item._count._all,
  }));
}
