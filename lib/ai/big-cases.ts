import { completeJson } from "@/lib/ai/openai";
import { bigCasesNoteSchema, bigCasesSystemPrompt, bigCasesUserPrompt } from "@/lib/ai/prompts";
import { AppError, ErrorCodes } from "@/lib/errors";
import { uniqueStrings } from "@/lib/utils";

export async function generateBigCasesNote(input: {
  title: string;
  meetingDate: string;
  participants: string[];
  transcript: string;
}) {
  const parsedUnknown = await completeJson([
    { role: "system", content: bigCasesSystemPrompt() },
    { role: "user", content: bigCasesUserPrompt(input) },
  ]);

  const parsed = bigCasesNoteSchema.safeParse(parsedUnknown);
  if (!parsed.success) {
    throw new AppError(
      ErrorCodes.MALFORMED_LLM_JSON,
      "The model could not turn that Big Cases meeting into a note. Try again.",
    );
  }

  return {
    title: parsed.data.title.trim() || input.title,
    summary: parsed.data.summary.trim(),
    body: parsed.data.body.trim(),
    keyPoints: uniqueStrings(parsed.data.key_points).slice(0, 16),
    keywords: uniqueStrings(parsed.data.keywords).slice(0, 16),
    litEvents: parsed.data.lit_events
      .map((row) => ({
        attorney: row.attorney.trim(),
        caseName: row.case.trim(),
        nextStep: row.next_step.trim(),
      }))
      .filter((row) => row.attorney && row.caseName && row.nextStep)
      .slice(0, 80),
  };
}
