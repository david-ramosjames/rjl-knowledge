import { completeJson } from "@/lib/ai/openai";
import { articleResponseSchema, slideDeckSystemPrompt, slideDeckUserPrompt } from "@/lib/ai/prompts";
import { DEFAULT_CATEGORIES, normalizeCategory } from "@/lib/categories";
import { AppError, ErrorCodes } from "@/lib/errors";
import type { SlideUpload } from "@/lib/ingest/slides";
import { uniqueStrings } from "@/lib/utils";

export async function generateArticleFromSlides(input: {
  title: string;
  category: string;
  slides: SlideUpload[];
}) {
  if (input.slides.length === 0) {
    throw new AppError(ErrorCodes.INGEST_FAILED, "Upload at least one slide screenshot.");
  }

  const parsedUnknown = await completeJson([
    { role: "system", content: slideDeckSystemPrompt() },
    {
      role: "user",
      content: [
        {
          type: "text",
          text: slideDeckUserPrompt({
            title: input.title,
            category: input.category,
            slideCount: input.slides.length,
          }),
        },
        ...input.slides.map((slide) => ({
          type: "image_url" as const,
          image_url: {
            url: `data:${slide.mimeType};base64,${slide.bytes.toString("base64")}`,
          },
        })),
      ],
    },
  ]);

  const parsed = articleResponseSchema.safeParse(parsedUnknown);
  if (!parsed.success) {
    throw new AppError(
      ErrorCodes.MALFORMED_LLM_JSON,
      "The model could not turn those slides into an article. Try again.",
    );
  }

  const category = normalizeExtractedCategory(parsed.data.category || input.category || "PI Mastermind");
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
