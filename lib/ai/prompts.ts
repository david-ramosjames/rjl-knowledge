import { z } from "zod";
import { DEFAULT_CATEGORIES } from "@/lib/categories";
import { parseTimestampToSeconds } from "@/lib/youtube";

function toSeconds(value: unknown, fallback: number | null = 0) {
  if (value == null || value === "") return fallback;
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.round(value));
  }
  if (typeof value === "string") {
    const parsed = parseTimestampToSeconds(value);
    if (parsed !== null) return parsed;
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return Math.max(0, Math.round(numeric));
  }
  return fallback;
}

export const extractedDiscussionSchema = z.object({
  title: z.string().min(1),
  category: z.string().min(1),
  start_seconds: z.preprocess((value) => toSeconds(value, 0), z.number().int().nonnegative()),
  end_seconds: z.preprocess((value) => toSeconds(value, null), z.number().int().nonnegative().nullable()),
  summary: z.string().min(1),
  key_points: z.array(z.string()),
  speakers: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
  transcript_excerpt: z.string().default(""),
  is_lasting_knowledge: z.boolean().default(true),
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
  return `You extract reusable internal knowledge from Ramos James Law attorney meeting transcripts for the Knowledge Hub.

Meetings are sources. Topics are permanent knowledge objects.

A typical attorney meeting should produce several topics. Return {"discussions": []} ONLY if the transcript is purely greetings, scheduling, coverage, or a to-do list with no legal, medical, insurance, damages, or practice discussion.

Core rules:
- Document ONLY what the attorneys and staff actually said in this transcript.
- Do NOT add outside legal knowledge, statutes, case law, medical theories, or advice that was not discussed.
- Do NOT invent facts, speakers, timestamps, or conclusions.
- If the transcript has no timestamps, use start_seconds 0 and do not invent times.

KEEP a discussion when it includes lasting, reusable knowledge, including:
- How the firm thinks about a type of legal, medical, insurance, or litigation issue
- Recurring case theories, objections, pitfalls, or practice standards
- Intake, case selection, settlement posture, client management, or firm process
- Specific-file talk that contains a principle — capture the principle, not the client's weekly status
  Example: "the Garcia file might get dropped because they stopped treating" → "Gaps in Medical Treatment"

DO NOT extract:
- Bare action items with no reasoning ("Ryan will call the client")
- Week-to-week logistics: who is covering a hearing, this week's calendar
- Scheduling, Zoom problems, and small talk
- Recaps of last week's tasks

If a stretch of conversation mixes a useful principle with an action item, keep the principle and drop the task list.

Normalize titles so similar discussions can accumulate under one durable topic name later. Example: "gap in treatment", "client stopped treating", and "treatment gaps" should map toward "Gaps in Medical Treatment". Never title a topic after a single client.

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
      "transcript_excerpt": "Relevant source passage from the transcript",
      "is_lasting_knowledge": true
    }
  ]
}`;
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

Extract reusable knowledge topics. Prefer several topics over none. Skip only pure logistics and to-do lists.

Timestamped transcript:
${input.transcript}`;
}

export function extractionRecoveryUserPrompt(input: {
  title: string;
  meetingDate: string;
  participants: string[];
  transcript: string;
}) {
  const participants =
    input.participants.length > 0 ? input.participants.join(", ") : "Not provided";

  return `The first pass returned no topics. That is usually too conservative for an attorney meeting.

Meeting title: ${input.title}
Meeting date: ${input.meetingDate}
Participants: ${participants}

Re-read the transcript and extract every substantive discussion of legal strategy, medical issues, insurance, damages, intake, settlement, client management, or firm process. Generalize specific-file talk into a durable topic title.

Skip only greetings, jokes, Zoom/admin issues, and bare task lists with no reasoning.

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
- Do not turn the topic into a task list, weekly status recap, or set of action items.
- If the new discussion adds nothing material, keep the existing summary and key points mostly intact.

Return JSON:
{
  "summary": "Updated overview of what RJL attorneys have discussed about this topic",
  "key_points": ["Updated point supported by the source discussions"],
  "keywords": ["keyword"]
}`;
}
