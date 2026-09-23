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

export const articleResponseSchema = z.object({
  title: z.string().min(1),
  category: z.string().min(1),
  summary: z.string().min(1),
  key_points: z.array(z.string()).default([]),
  body: z.string().min(1),
  keywords: z.array(z.string()).default([]),
});

export type GeneratedArticle = z.infer<typeof articleResponseSchema>;

export const litEventSchema = z.object({
  attorney: z.string().min(1),
  case: z.string().min(1),
  next_step: z.string().min(1),
});

export const bigCasesNoteSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  key_points: z.array(z.string()).default([]),
  body: z.string().min(1),
  keywords: z.array(z.string()).default([]),
  lit_events: z.array(litEventSchema).default([]),
});

export function bigCasesSystemPrompt() {
  return `You write one overall monthly Big Cases note for Ramos James Law.

These meetings are NOT for extracting reusable knowledge topics. Do not split the meeting into separate topic pages. Hold everything as a single staff-facing note.

Meeting focus: Move each attorney’s highest-value and developing cases forward before the next monthly review. The emphasis is on creating concrete litigation activity rather than allowing cases to sit while waiting on records or the defense.

Rules:
- Use ONLY the transcript. Do not invent cases, facts, deadlines, or next steps.
- Organize the note by attorney. For each attorney discussed, cover their top or developing cases and the next steps to move them.
- Keep case names, file descriptions, and assignments as they were said.
- Include concrete activity: what to file, who to notice, what to request, what to set, what is blocking progress.
- Skip greetings, Zoom problems, and small talk.
- The summary should be a complete overview of the month’s review, not a teaser.
- Key points should be the most important next steps across the meeting.
- Also fill a lit-events tracker table. One row per concrete next step. If one case has two next steps, use two rows. Keep attorney, case name/file number, and the next step as said.

Return JSON:
{
  "title": "Big Cases — Month Year",
  "summary": "Complete overview of this monthly review",
  "key_points": ["Concrete next step, including the attorney or case when it was said"],
  "body": "Full note organized by attorney. Use line breaks between attorneys and cases.",
  "keywords": ["attorney name", "case type"],
  "lit_events": [
    {
      "attorney": "Jesús",
      "case": "Charlie Wright 16366",
      "next_step": "File suit"
    }
  ]
}`;
}

export function bigCasesUserPrompt(input: {
  title: string;
  meetingDate: string;
  participants: string[];
  transcript: string;
}) {
  const participants =
    input.participants.length > 0 ? input.participants.join(", ") : "Not provided";

  return `Write one overall Big Cases note and a lit-events tracker table. Do not extract separate topics.

Meeting title: ${input.title}
Meeting date: ${input.meetingDate}
Participants: ${participants}

Timestamped transcript:
${input.transcript}`;
}

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

Write complete topic pages, not teasers. Each summary should be 5–8 sentences covering the issue, the firm’s reasoning, any caveats, and the takeaway. Each topic should have 6–12 key points written as complete sentences staff can apply later. Include the why when the transcript has it.

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
      "summary": "A complete staff-facing overview of this discussion. Write 5–8 sentences covering the issue, how the attorneys thought about it, distinctions or caveats they made, and the practical takeaway. Do not write a teaser.",
      "key_points": ["A complete, usable sentence staff can apply later, including the why when it was said"],
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

For each topic, write a complete overview and 6–12 key points. Staff who were not in the meeting should understand the substance, not just the headline.

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
  return `You rewrite an internal Knowledge Hub topic so staff can use it without rewatching the meeting.

Rules:
- Use ONLY the provided topic text and source transcripts. Those transcripts are the article.
- Do NOT add outside legal knowledge, statutes, case law, or independent advice.
- The current summary and key points may be thin. Expand them. Completeness matters more than brevity.
- Write a staff-facing overview of 2 paragraphs or 6–10 sentences. Cover the issue, how the attorneys reasoned, distinctions or caveats, and the practical takeaway.
- Write 8–14 key points. Each must be a complete sentence staff can apply later, including the why when it was said. Do not write fragments, labels, or teasers.
- Merge duplicates, but keep distinct ideas from different meetings.
- Preserve traceability: every sentence must be faithful to what attorneys actually said.
- Do not turn the topic into a task list, weekly status recap, or set of action items.

Return JSON:
{
  "summary": "Complete overview of what RJL attorneys have discussed about this topic",
  "key_points": ["Complete, usable point supported by the source transcripts"],
  "keywords": ["keyword"]
}`;
}

export function articleSystemPrompt() {
  return `You ingest an internal Ramos James Law document and write a searchable Knowledge Hub article from it.

Rules:
- Read the entire provided document text and turn it into a clear staff-facing article.
- Use ONLY the provided document. Do not invent policy, process, or legal advice.
- Keep names, conventions, steps, and requirements exactly as written.
- Organize the article so someone can follow it without opening the original file.
- Do not mention a specific client case.
- If a suggested title or category is provided, prefer it when it fits.
- Category should be a firm knowledge area such as Firm Guides, Naming Conventions, IT, HR & Benefits, Onboarding, Operations, or Firm Process.
- The summary must be complete, not a teaser: 1–2 paragraphs (at least 5 sentences) explaining what the document covers and when staff should use it.
- Write 8–14 key points. Each is a specific rule, step, or requirement from the document, written as a complete sentence.

Return JSON:
{
  "title": "Clear document title",
  "category": "Naming Conventions",
  "summary": "Complete overview of what this document covers and when staff should use it",
  "key_points": ["Specific, complete rule or step staff should remember"],
  "body": "Readable article in plain paragraphs. Use line breaks for lists. Cover the important rules and steps from the source.",
  "keywords": ["naming", "files"]
}`;
}

export function articleUserPrompt(input: {
  title: string;
  category: string;
  fileName?: string | null;
  sourceText: string;
}) {
  return `Suggested title: ${input.title || "Not provided"}
Suggested category: ${input.category || "Not provided"}
File name: ${input.fileName || "Not provided"}

Document text:
${input.sourceText}`;
}
