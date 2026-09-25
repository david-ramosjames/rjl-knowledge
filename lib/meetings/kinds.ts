import { MeetingKind } from "@/lib/generated/prisma/client";

export type ReviewMeetingKind = "BIG_CASES" | "NEW_CASES";
export type MeetingKindInput = "KNOWLEDGE" | ReviewMeetingKind;

export function parseMeetingKind(raw: string): MeetingKindInput {
  if (raw === "BIG_CASES" || raw === "NEW_CASES") return raw;
  return "KNOWLEDGE";
}

export function toPrismaMeetingKind(kind?: string | null) {
  if (kind === "BIG_CASES") return MeetingKind.BIG_CASES;
  if (kind === "NEW_CASES") return MeetingKind.NEW_CASES;
  return MeetingKind.KNOWLEDGE;
}

export function isReviewMeetingKind(kind?: string | null): kind is ReviewMeetingKind {
  return kind === "BIG_CASES" || kind === "NEW_CASES";
}

export function meetingKindLabel(kind?: string | null) {
  if (kind === "BIG_CASES") return "Big Cases";
  if (kind === "NEW_CASES") return "New Cases";
  return "Practice knowledge";
}

export function reviewNoteCategory(kind: ReviewMeetingKind) {
  return kind === "NEW_CASES" ? "New Cases" : "Big Cases";
}

export function articleKindLabel(input: { category?: string | null; meetingKind?: string | null }) {
  if (isReviewMeetingKind(input.meetingKind)) return meetingKindLabel(input.meetingKind);
  if (input.category === "Big Cases" || input.category === "New Cases") return input.category;
  return "Document";
}

export function trackerHeading(category?: string | null) {
  return category === "New Cases" ? "New cases tracker" : "Upcoming lit events";
}
