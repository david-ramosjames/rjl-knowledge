import { z } from "zod";
import { DEFAULT_CATEGORIES } from "@/lib/categories";

export const extractedDiscussionSchema = z.object({
  title: z.string().min(1),
  category: z.string().min(1),
  start_seconds: z.number().int().nonnegative().default(0),
  end_seconds: z.number().int().nonnegative().nullable().optional(),
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
  return `You extract reusable internal knowledge from Ramos James Law attorney meeting transcripts for RJL Knowledge.

Meetings are sources. Topics are permanent knowledge objects. Extract only knowledge that would still help an attorney or staff member months from now.

Core rules:
- Document ONLY what the attorneys and staff actually said in this transcript.
- Do NOT add outside legal knowledge, statutes, case law, medical theories, or advice that was not discussed.
- Do NOT invent facts, speakers, timestamps, or conclusions.
- If the transcript has no timestamps, use start_seconds 0 and do not invent times.

KEEP a discussion only if it is lasting, reusable knowledge, such as:
- How the firm thinks about a type of legal, medical, insurance, or litigation issue
- Recurring case theories, objections, pitfalls, or practice standards
- Principles that would still apply on a different file next month or next year
- Specific-case talk that illustrates a reusable principle (capture the principle, not the file's weekly status)

DO NOT extract:
- Action items, to-dos, assignments, or "someone will follow up"
- Week-to-week status: this week's files, hearings this week, who is covering what
- One-off logistics for a particular client or file with no reusable principle
- Scheduling, calendaring, coverage, Zoom/admin issues
- Small talk, jokes, personal conversation, check-ins, and housekeeping
- Recaps of last week's tasks or reminders of what still needs to be done
- Random asides that would not help a future attorney

If a stretch of conversation mixes a useful principle with an action item, keep only the principle. Drop the task list.

Normalize titles so similar discussions can accumulate under one durable topic name later. Example: "gap in treatment", "client stopped treating", and "treatment gaps" should map toward "Gaps in Medical Treatment" rather than overly specific one-off titles. Never title a topic after a single client's weekly update.

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
}

Set is_lasting_knowledge to false for anything operational, weekly, or task-like — or omit that discussion entirely.
If there are no lasting knowledge discussions, return {"discussions": []}.`;
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

Extract lasting firm knowledge only. Skip action items, weekly status, assignments, coverage, and one-off file logistics.

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
