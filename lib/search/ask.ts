import { completeJson, embedTexts } from "@/lib/ai/openai";
import {
  knowledgeAskResponseSchema,
  knowledgeAskSystemPrompt,
  knowledgeAskUserPrompt,
} from "@/lib/ai/prompts";
import { prisma } from "@/lib/db/prisma";
import { AppError, ErrorCodes } from "@/lib/errors";
import { logError } from "@/lib/logger";
import {
  searchKnowledge,
  type KnowledgeKind,
  type KnowledgeSearchResult,
} from "@/lib/search";
import { backfillKnowledgeIndex, searchKnowledgeChunks } from "@/lib/search/index-knowledge";
import { articleKindLabel } from "@/lib/meetings/kinds";
import { asStringArray } from "@/lib/utils";

export type KnowledgeAskCitation = {
  id: string;
  kind: KnowledgeKind;
  title: string;
  href: string;
  category: string;
};

export type KnowledgeAskResult = {
  found: boolean;
  answer: string;
  citations: KnowledgeAskCitation[];
};

function passageForResult(item: KnowledgeSearchResult, extra = "") {
  return `[${item.kind}:${item.id}] ${item.title} (${item.category})
${item.summary}
${extra}`.trim();
}

async function loadPassage(item: KnowledgeSearchResult) {
  if (item.kind === "article") {
    const article = await prisma.article.findUnique({
      where: { id: item.id },
      select: { body: true, keyPoints: true },
    });
    if (!article) return passageForResult(item);
    const points = asStringArray(article.keyPoints)
      .slice(0, 8)
      .map((point) => `- ${point}`)
      .join("\n");
    return passageForResult(item, `${points}\n${article.body.slice(0, 3500)}`);
  }

  const topic = await prisma.topic.findUnique({
    where: { id: item.id },
    select: {
      keyPoints: true,
      discussions: {
        select: { sourceSummary: true, transcriptExcerpt: true },
        take: 2,
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!topic) return passageForResult(item);
  const points = asStringArray(topic.keyPoints)
    .slice(0, 8)
    .map((point) => `- ${point}`)
    .join("\n");
  const excerpts = topic.discussions
    .map((discussion) => discussion.transcriptExcerpt || discussion.sourceSummary)
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 2500);
  return passageForResult(item, `${points}\n${excerpts}`);
}

function toResultFromChunk(chunk: {
  kind: KnowledgeKind;
  sourceId: string;
  title: string;
  slug: string;
  href: string;
  category: string;
  score: number;
}): KnowledgeSearchResult {
  return {
    id: chunk.sourceId,
    kind: chunk.kind,
    title: chunk.title,
    slug: chunk.slug,
    href: chunk.href,
    category: chunk.category,
    summary: "",
    lastDiscussedAt: null,
    meta: articleKindLabel({ category: chunk.category }),
    rank: 40 + chunk.score * 60,
  };
}

export async function askKnowledge(query: string, options?: { category?: string }): Promise<KnowledgeAskResult | null> {
  const q = query.trim();
  if (q.length < 2) return null;

  try {
    await backfillKnowledgeIndex(80);
  } catch (error) {
    logError("Knowledge backfill skipped", {
      message: error instanceof Error ? error.message : "unknown",
    });
  }

  const keywordResults = await searchKnowledge(q, options);
  let semanticResults: KnowledgeSearchResult[] = [];

  try {
    const [embedding] = await embedTexts([q]);
    if (embedding) {
      const chunks = await searchKnowledgeChunks(embedding, 16);
      semanticResults = chunks
        .filter((chunk) => chunk.score >= 0.28)
        .map(toResultFromChunk);
    }
  } catch (error) {
    logError("Semantic search unavailable; using keyword passages", {
      message: error instanceof Error ? error.message : "unknown",
    });
  }

  const merged = new Map<string, KnowledgeSearchResult>();
  for (const item of [...semanticResults, ...keywordResults]) {
    const key = `${item.kind}:${item.id}`;
    const existing = merged.get(key);
    if (!existing || item.rank > existing.rank) merged.set(key, item);
  }

  const top = [...merged.values()]
    .sort((a, b) => b.rank - a.rank)
    .slice(0, 8);

  if (top.length === 0) {
    return {
      found: false,
      answer: "Nothing in the hub clearly covers that yet. Try a name, form, or process staff would have written down.",
      citations: [],
    };
  }

  const passages = (await Promise.all(top.map(loadPassage))).join("\n\n----\n\n").slice(0, 22000);

  try {
    const parsedUnknown = await completeJson([
      { role: "system", content: knowledgeAskSystemPrompt() },
      { role: "user", content: knowledgeAskUserPrompt(q, passages) },
    ]);
    const parsed = knowledgeAskResponseSchema.safeParse(parsedUnknown);
    if (!parsed.success) {
      return {
        found: false,
        answer: "The hub found related pages, but could not write a clean answer. Browse the matches below.",
        citations: top.slice(0, 3).map((item) => ({
          id: item.id,
          kind: item.kind,
          title: item.title,
          href: item.href,
          category: item.category,
        })),
      };
    }

    const allowed = new Map(top.map((item) => [`${item.kind}:${item.id}`, item]));
    const citations = parsed.data.citations.flatMap((citation) => {
      const item = allowed.get(`${citation.kind}:${citation.id}`);
      if (!item) return [];
      return [
        {
          id: item.id,
          kind: item.kind,
          title: item.title,
          href: item.href,
          category: item.category,
        },
      ];
    });

    return {
      found: parsed.data.found,
      answer: parsed.data.answer.trim(),
      citations: citations.length > 0 ? citations : parsed.data.found ? top.slice(0, 3).map((item) => ({
        id: item.id,
        kind: item.kind,
        title: item.title,
        href: item.href,
        category: item.category,
      })) : [],
    };
  } catch (error) {
    if (error instanceof AppError && error.code === ErrorCodes.OPENAI_FAILURE) {
      return null;
    }
    logError("Knowledge ask failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return null;
  }
}
