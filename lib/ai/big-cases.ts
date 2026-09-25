import { completeJson } from "@/lib/ai/openai";
import {
  bigCasesNoteSchema,
  bigCasesSystemPrompt,
  bigCasesUserPrompt,
  newCasesSystemPrompt,
  newCasesUserPrompt,
} from "@/lib/ai/prompts";
import { AppError, ErrorCodes } from "@/lib/errors";
import type { ReviewMeetingKind } from "@/lib/meetings/kinds";
import { uniqueStrings } from "@/lib/utils";

export async function generateReviewNote(
  kind: ReviewMeetingKind,
  input: {
    title: string;
    meetingDate: string;
    participants: string[];
    transcript: string;
  },
) {
  const parsedUnknown = await completeJson([
    {
      role: "system",
      content: kind === "NEW_CASES" ? newCasesSystemPrompt() : bigCasesSystemPrompt(),
    },
    {
      role: "user",
      content: kind === "NEW_CASES" ? newCasesUserPrompt(input) : bigCasesUserPrompt(input),
    },
  ]);

  const parsed = bigCasesNoteSchema.safeParse(parsedUnknown);
  if (!parsed.success) {
    throw new AppError(
      ErrorCodes.MALFORMED_LLM_JSON,
      kind === "NEW_CASES"
        ? "The model could not turn that New Cases Review into a note. Try again."
        : "The model could not turn that Big Cases meeting into a note. Try again.",
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

/** @deprecated Use generateReviewNote */
export const generateBigCasesNote = (input: Parameters<typeof generateReviewNote>[1]) =>
  generateReviewNote("BIG_CASES", input);
