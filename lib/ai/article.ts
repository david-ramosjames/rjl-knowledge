import { completeJson } from "@/lib/ai/openai";
import {
  articleResponseSchema,
  articleSystemPrompt,
  articleUserPrompt,
  scannedDocumentSystemPrompt,
  scannedDocumentUserPrompt,
} from "@/lib/ai/prompts";
import { DEFAULT_CATEGORIES, normalizeCategory } from "@/lib/categories";
import { AppError, ErrorCodes } from "@/lib/errors";
import type { IngestedDocument } from "@/lib/ingest/document";
import type { SlideUpload } from "@/lib/ingest/slides";
import { uniqueStrings } from "@/lib/utils";

export async function generateArticleFromIngested(input: {
  title: string;
  category: string;
  fileName?: string | null;
  ingested: IngestedDocument;
}) {
  if (input.ingested.pages && input.ingested.pages.length > 0) {
    return generateArticleFromDocumentImages({
      title: input.title,
      category: input.category,
      fileName: input.fileName ?? input.ingested.fileName,
      pages: input.ingested.pages,
    });
  }
  if (!input.ingested.text.trim()) {
    throw new AppError(
      ErrorCodes.INGEST_FAILED,
      "The AI could not read any text from that file.",
    );
  }
  return generateArticleFromDocument({
    title: input.title,
    category: input.category,
    fileName: input.fileName ?? input.ingested.fileName,
    sourceText: input.ingested.text,
  });
}

export async function generateArticleFromDocument(input: {
  title: string;
  category: string;
  fileName?: string | null;
  sourceText: string;
}) {
  return parseArticleResponse(
    await completeJson([
      { role: "system", content: articleSystemPrompt() },
      { role: "user", content: articleUserPrompt(input) },
    ]),
    input,
  );
}

export async function generateArticleFromDocumentImages(input: {
  title: string;
  category: string;
  fileName?: string | null;
  pages: SlideUpload[];
}) {
  if (input.pages.length === 0) {
    throw new AppError(ErrorCodes.INGEST_FAILED, "No PDF pages were available for vision.");
  }

  return parseArticleResponse(
    await completeJson([
      { role: "system", content: scannedDocumentSystemPrompt() },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: scannedDocumentUserPrompt({
              title: input.title,
              category: input.category,
              fileName: input.fileName,
              pageCount: input.pages.length,
            }),
          },
          ...input.pages.map((page) => ({
            type: "image_url" as const,
            image_url: {
              url: `data:${page.mimeType};base64,${page.bytes.toString("base64")}`,
            },
          })),
        ],
      },
    ]),
    input,
  );
}

function parseArticleResponse(
  parsedUnknown: unknown,
  input: { title: string; category: string },
) {
  const parsed = articleResponseSchema.safeParse(parsedUnknown);
  if (!parsed.success) {
    throw new AppError(
      ErrorCodes.MALFORMED_LLM_JSON,
      "The model could not turn that document into an article. Try ingesting it again.",
    );
  }

  const category = normalizeExtractedCategory(parsed.data.category || input.category);
  return {
    title: parsed.data.title.trim() || input.title,
    category,
    summary: parsed.data.summary.trim(),
    body: parsed.data.body.trim(),
    keyPoints: uniqueStrings(parsed.data.key_points).slice(0, 14),
    keywords: uniqueStrings(parsed.data.keywords).slice(0, 16),
  };
}

function normalizeExtractedCategory(category: string) {
  const normalized = normalizeCategory(category);
  const preferred = DEFAULT_CATEGORIES.find((item) => item.toLowerCase() === normalized.toLowerCase());
  return preferred ?? normalized;
}
