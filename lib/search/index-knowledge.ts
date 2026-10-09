import { createHash, randomUUID } from "node:crypto";
import { Prisma, TopicStatus } from "@/lib/generated/prisma/client";
import { embedTexts } from "@/lib/ai/openai";
import { prisma } from "@/lib/db/prisma";
import { logError } from "@/lib/logger";
import { asLitEvents, asStringArray } from "@/lib/utils";
type KnowledgeKind = "topic" | "article";

const CHUNK_CHARS = 1600;
const CHUNK_OVERLAP = 180;
const MAX_CHUNKS = 6;

type IndexableSource = {
  kind: KnowledgeKind;
  id: string;
  title: string;
  slug: string;
  href: string;
  category: string;
  text: string;
};

function vectorLiteral(values: number[]) {
  return `[${values.join(",")}]`;
}

function hashText(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function splitChunks(text: string) {
  const clean = text.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim();
  if (!clean) return [];
  if (clean.length <= CHUNK_CHARS) return [clean];

  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length && chunks.length < MAX_CHUNKS) {
    let end = Math.min(start + CHUNK_CHARS, clean.length);
    if (end < clean.length) {
      const slice = clean.slice(start, end);
      const breakAt = Math.max(slice.lastIndexOf("\n\n"), slice.lastIndexOf(". "), slice.lastIndexOf("\n"));
      if (breakAt > CHUNK_CHARS * 0.55) end = start + breakAt + 1;
    }
    const chunk = clean.slice(start, end).trim();
    if (chunk) chunks.push(chunk);
    if (end >= clean.length) break;
    start = Math.max(end - CHUNK_OVERLAP, start + 1);
  }
  return chunks;
}

function sourceText(input: {
  title: string;
  category: string;
  summary: string;
  keyPoints: string[];
  keywords: string[];
  body?: string;
}) {
  return [
    input.title,
    input.category,
    input.summary,
    ...input.keyPoints,
    ...input.keywords,
    input.body ?? "",
  ]
    .map((part) => part.trim())
    .filter(Boolean)
    .join("\n");
}

async function loadArticleSource(id: string): Promise<IndexableSource | null> {
  const article = await prisma.article.findUnique({ where: { id } });
  if (!article || article.status !== TopicStatus.APPROVED) return null;
  const tracker = asLitEvents(article.litEvents)
    .map((row) => `${row.attorney} / ${row.caseName}: ${row.nextStep}`)
    .join("\n");
  return {
    kind: "article",
    id: article.id,
    title: article.title,
    slug: article.slug,
    href: `/articles/${article.slug}`,
    category: article.category,
    text: sourceText({
      title: article.title,
      category: article.category,
      summary: article.summary,
      keyPoints: asStringArray(article.keyPoints),
      keywords: asStringArray(article.keywords),
      body: [article.body, tracker].filter(Boolean).join("\n"),
    }),
  };
}

async function loadTopicSource(id: string): Promise<IndexableSource | null> {
  const topic = await prisma.topic.findUnique({
    where: { id },
    include: {
      discussions: {
        orderBy: { createdAt: "asc" },
        take: 4,
      },
    },
  });
  if (!topic || topic.status !== TopicStatus.APPROVED) return null;
  const excerpts = topic.discussions
    .map((discussion) => discussion.transcriptExcerpt || discussion.sourceSummary)
    .filter(Boolean)
    .join("\n\n");
  return {
    kind: "topic",
    id: topic.id,
    title: topic.title,
    slug: topic.slug,
    href: `/topics/${topic.slug}`,
    category: topic.category,
    text: sourceText({
      title: topic.title,
      category: topic.category,
      summary: topic.summary,
      keyPoints: asStringArray(topic.keyPoints),
      keywords: asStringArray(topic.keywords),
      body: excerpts,
    }),
  };
}

export async function removeKnowledgeIndex(kind: KnowledgeKind, sourceId: string) {
  await prisma.knowledgeChunk.deleteMany({ where: { kind, sourceId } });
}

export async function indexKnowledgeSource(kind: KnowledgeKind, sourceId: string) {
  const source = kind === "article" ? await loadArticleSource(sourceId) : await loadTopicSource(sourceId);
  if (!source) {
    await removeKnowledgeIndex(kind, sourceId);
    return;
  }

  const chunks = splitChunks(source.text).map((content, chunkIndex) => ({
    chunkIndex,
    content: `${source.title}\n${source.category}\n\n${content}`,
  }));
  if (chunks.length === 0) {
    await removeKnowledgeIndex(kind, sourceId);
    return;
  }

  const contentHash = hashText(chunks.map((chunk) => chunk.content).join("\n---\n"));
  const existing = await prisma.knowledgeChunk.findMany({
    where: { kind, sourceId },
    select: { contentHash: true, chunkIndex: true },
    orderBy: { chunkIndex: "asc" },
  });
  if (
    existing.length === chunks.length &&
    existing.every((row, index) => row.contentHash === contentHash && row.chunkIndex === index)
  ) {
    return;
  }

  const embeddings = await embedTexts(chunks.map((chunk) => chunk.content));
  if (embeddings.length !== chunks.length) {
    throw new Error("Embedding count did not match knowledge chunks.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.knowledgeChunk.deleteMany({ where: { kind, sourceId } });
    const now = new Date();
    for (const [index, chunk] of chunks.entries()) {
      const embedding = embeddings[index];
      if (!embedding) continue;
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO "KnowledgeChunk" (
          "id", "kind", "sourceId", "chunkIndex", "title", "slug", "href", "category",
          "content", "contentHash", "embedding", "createdAt", "updatedAt"
        ) VALUES (
          ${randomUUID()},
          ${source.kind},
          ${source.id},
          ${chunk.chunkIndex},
          ${source.title},
          ${source.slug},
          ${source.href},
          ${source.category},
          ${chunk.content},
          ${contentHash},
          ${vectorLiteral(embedding)}::vector,
          ${now},
          ${now}
        )
      `);
    }
  });
}

export async function refreshKnowledgeIndex(kind: KnowledgeKind, sourceId: string) {
  try {
    await indexKnowledgeSource(kind, sourceId);
  } catch (error) {
    logError("Knowledge index refresh failed", {
      kind,
      sourceId,
      message: error instanceof Error ? error.message : "unknown",
    });
  }
}

export async function backfillKnowledgeIndex(limit = 80) {
  const [articles, topics, indexed] = await Promise.all([
    prisma.article.findMany({
      where: { status: TopicStatus.APPROVED },
      select: { id: true, updatedAt: true },
    }),
    prisma.topic.findMany({
      where: { status: TopicStatus.APPROVED },
      select: { id: true, updatedAt: true },
    }),
    prisma.knowledgeChunk.groupBy({
      by: ["kind", "sourceId"],
      _max: { updatedAt: true },
    }),
  ]);

  const latest = new Map(
    indexed.map((row) => [`${row.kind}:${row.sourceId}`, row._max.updatedAt?.getTime() ?? 0]),
  );
  const missing: Array<{ kind: KnowledgeKind; id: string }> = [];

  for (const article of articles) {
    const stamped = latest.get(`article:${article.id}`) ?? 0;
    if (stamped < article.updatedAt.getTime()) missing.push({ kind: "article", id: article.id });
  }
  for (const topic of topics) {
    const stamped = latest.get(`topic:${topic.id}`) ?? 0;
    if (stamped < topic.updatedAt.getTime()) missing.push({ kind: "topic", id: topic.id });
  }

  for (const item of missing.slice(0, limit)) {
    await refreshKnowledgeIndex(item.kind, item.id);
  }

  return missing.length;
}

export async function searchKnowledgeChunks(queryEmbedding: number[], limit = 16) {
  const vector = vectorLiteral(queryEmbedding);
  return prisma.$queryRaw<
    Array<{
      id: string;
      kind: KnowledgeKind;
      sourceId: string;
      title: string;
      slug: string;
      href: string;
      category: string;
      content: string;
      score: number;
    }>
  >(Prisma.sql`
    SELECT
      id,
      kind,
      "sourceId",
      title,
      slug,
      href,
      category,
      content,
      (1 - (embedding <=> ${vector}::vector))::float AS score
    FROM "KnowledgeChunk"
    ORDER BY embedding <=> ${vector}::vector
    LIMIT ${limit}
  `);
}
