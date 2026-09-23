import { completeJson } from "@/lib/ai/openai";
import { articleResponseSchema, articleSystemPrompt, articleUserPrompt } from "@/lib/ai/prompts";
import { DEFAULT_CATEGORIES, normalizeCategory } from "@/lib/categories";
import { AppError, ErrorCodes } from "@/lib/errors";
import { uniqueStrings } from "@/lib/utils";

export async function generateArticleFromDocument(input: {
  title: string;
  category: string;
  fileName?: string | null;
  sourceText: string;
}) {
  const parsedUnknown = await completeJson([
    { role: "system", content: articleSystemPrompt() },
    { role: "user", content: articleUserPrompt(input) },
  ]);

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
