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

These meetings are practice-knowledge discussions. They are NEVER used to identify, name, or classify a specific client case. Do not try to figure out which file a remark belongs to.

A typical 30–60 minute attorney meeting should produce many topics, often 8–20. Split every distinct reusable issue into its own topic. Do not collapse an entire meeting into a handful of buckets. Return {"discussions": []} ONLY if the transcript is purely greetings, scheduling, coverage, or a to-do list with no legal, medical, insurance, damages, or practice discussion.

Core rules:
- Document ONLY what the attorneys and staff actually said in this transcript.
- Do NOT add outside legal knowledge, statutes, case law, medical theories, or advice that was not discussed.
- Do NOT invent facts, speakers, timestamps, or conclusions.
- If the transcript has no timestamps, use start_seconds 0 and do not invent times.
- NEVER name a client, case caption, or file number.
- NEVER use placeholders such as "Unidentified", "Unknown case", "Unknown client", or "Unidentified speaker".
- Category is a practice area, never a case or client label. If unsure, use Other.
- Speakers must be real people named in the transcript or participant list. If a transcript labels someone Unidentified, omit speakers for that topic.

KEEP a discussion when it includes lasting, reusable knowledge, including:
- How the firm thinks about a type of legal, medical, insurance, or litigation issue
- Recurring theories, objections, pitfalls, or practice standards
- Intake, case selection, settlement posture, client management, or firm process
- Talk that happens to mention a file but contains a principle — capture the principle only
  Example: "that file might get dropped because they stopped treating" → "Gaps in Medical Treatment"

DO NOT extract:
- Bare action items with no reasoning ("Ryan will call the client")
- Week-to-week logistics: who is covering a hearing, this week's calendar
- Scheduling, Zoom problems, and small talk
- Recaps of last week's tasks
- Anything whose value depends on identifying a specific case

If a stretch of conversation mixes a useful principle with an action item, keep the principle and drop the task list.

Normalize titles so similar discussions can accumulate under one durable topic name later. Example: "gap in treatment", "client stopped treating", and "treatment gaps" should map toward "Gaps in Medical Treatment". Never title a topic after a client or as Unidentified.

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

Extract reusable practice-knowledge topics. Split distinct issues. Prefer many topics over a few large ones. Do not classify or name specific cases. Skip only pure logistics and to-do lists.

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

Re-read the transcript and extract every substantive discussion of legal strategy, medical issues, insurance, damages, intake, settlement, client management, or firm process. Turn file-specific talk into a durable practice topic. Do not name or classify specific cases. Do not use Unidentified.

Skip only greetings, jokes, Zoom/admin issues, and bare task lists with no reasoning.

Timestamped transcript:
${input.transcript}`;
}

export function extractionExpansionUserPrompt(
  input: {
    title: string;
    meetingDate: string;
    participants: string[];
    transcript: string;
  },
  existingTitles: string[],
) {
  const participants =
    input.participants.length > 0 ? input.participants.join(", ") : "Not provided";
  const alreadyFound = existingTitles.map((title) => `- ${title}`).join("\n");

  return `The first pass only found ${existingTitles.length} topic(s). That is too few for an attorney meeting. Find ADDITIONAL distinct practice-knowledge topics that were discussed but are not listed below.

Already extracted:
${alreadyFound || "- (none)"}

Meeting title: ${input.title}
Meeting date: ${input.meetingDate}
Participants: ${participants}

Do not repeat the titles above. Do not name or classify specific cases. Do not use Unidentified. Skip greetings, jokes, Zoom/admin issues, and bare task lists.

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
