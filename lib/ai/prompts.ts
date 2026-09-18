import { z } from "zod";
import { DEFAULT_CATEGORIES } from "@/lib/categories";

export const extractedDiscussionSchema = z.object({
  title: z.string().min(1),
  category: z.string().min(1),
  start_seconds: z.number().int().nonnegative(),
  end_seconds: z.number().int().nonnegative().nullable().optional(),
  summary: z.string().min(1),
  key_points: z.array(z.string()),
  speakers: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
  transcript_excerpt: z.string().default(""),
});

export const extractionResponseSchema = z.object({
  discussions: z.array(extractedDiscussionSchema),
});

export type ExtractedDiscussion = z.infer<typeof extractedDiscussionSchema>;

export const synthesisResponseSchema = z.object({
  summary: z.string().min(1),
  key_points: z.array(z.string()).min(1),
  keywords: z.array(z.string()).default([]),
});

export function extractionSystemPrompt() {
  return `You extract reusable internal knowledge from Ramos James Law attorney meeting transcripts for RJL Knowledge.

Core rules:
- Document ONLY what the attorneys and staff actually said in this transcript.
- Do NOT add outside legal knowledge, statutes, case law, medical theories, or advice that was not discussed.
- Do NOT invent facts, speakers, timestamps, or conclusions.
- Ignore small talk, scheduling, jokes, personal conversations, administrative chatter, and anything that would not help a future attorney or staff member.

Your job is to identify substantive, reusable knowledge discussions. Each discussion becomes a topic with a timestamp into the original meeting video.

Normalize titles so similar discussions can accumulate under one durable topic name later. Example: "gap in treatment", "client stopped treating", and "treatment gaps" should map toward "Gaps in Medical Treatment" rather than overly specific one-off titles.

Preferred categories (use one when it fits; otherwise a short new category is allowed):
${DEFAULT_CATEGORIES.join(", ")}

Return JSON with this exact shape:
{
  "discussions": [
    {
      "title": "Gaps in Medical Treatment",
      "category": "Medical",
      "start_seconds": 762,
      "end_seconds": 1096,
      "summary": "Concise description of what was discussed, using only the transcript.",
      "key_points": ["Point directly supported by the discussion"],
      "speakers": ["Laura James", "Ryan"],
      "keywords": ["treatment gap", "medical treatment"],
      "transcript_excerpt": "Relevant source passage from the transcript"
    }
  ]
}

If there are no substantive knowledge discussions, return {"discussions": []}.`;
}

export function extractionUserPrompt(input: {
  title: string;
  meetingDate: string;
  participants: string[];
  transcript: string;
}) {
  const participants =
    input.participants.length > 0 ? input.participants.join(", ") : "Not provided";

  return `Meeting title: ${input.title}
Meeting date: ${input.meetingDate}
Participants: ${participants}

Timestamped transcript:
${input.transcript}`;
}

export function synthesisSystemPrompt() {
  return `You update an internal knowledge topic using only the firm's own meeting discussions.

Rules:
- Synthesize ONLY from the provided existing topic text and source discussions.
- Do NOT add outside legal knowledge, statutes, case law, or independent advice.
- Preserve traceability: the overview and key points must remain faithful to what attorneys actually said.
- Prefer durable, reusable wording. Remove duplication while keeping distinct points from different meetings.
- If the new discussion adds nothing material, keep the existing summary and key points mostly intact.

Return JSON:
{
  "summary": "Updated overview of what RJL attorneys have discussed about this topic",
  "key_points": ["Updated point supported by the source discussions"],
  "keywords": ["keyword"]
}`;
}
