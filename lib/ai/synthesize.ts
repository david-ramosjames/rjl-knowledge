import { completeJson } from "@/lib/ai/openai";
import { synthesisSystemPrompt, synthesisResponseSchema } from "@/lib/ai/prompts";
import { prisma } from "@/lib/db/prisma";
import { AppError, ErrorCodes } from "@/lib/errors";
import { logError } from "@/lib/logger";
import { excerptForRange, parseTranscript } from "@/lib/transcript/parse";
import { asStringArray, buildSearchText, namedSpeakers, uniqueStrings } from "@/lib/utils";

export async function synthesizeTopicFromDiscussions(
  topicId: string,
  options?: { required?: boolean },
) {
  const topic = await prisma.topic.findUnique({
    where: { id: topicId },
    include: {
      discussions: {
        include: { meeting: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!topic || topic.discussions.length === 0) {
    if (options?.required) {
      throw new AppError(ErrorCodes.NOT_FOUND, "This topic has no source transcript to refresh from.");
    }
    return;
  }

  const existingKeyPoints = asStringArray(topic.keyPoints);
  const existingKeywords = asStringArray(topic.keywords);

  const discussionBlocks = topic.discussions.map((discussion, index) => {
    const speakers = namedSpeakers(asStringArray(discussion.speakers)).join(", ");
    const transcript = transcriptForDiscussion(discussion);
    return `Source ${index + 1}
Meeting: ${discussion.meeting.title} (${discussion.meeting.meetingDate.toISOString().slice(0, 10)})
${speakers ? `Speakers: ${speakers}\n` : ""}Existing source summary (may be thin — expand from the transcript):
${discussion.sourceSummary}

Source transcript for this topic:
${transcript}`;
  });

  try {
    const parsedUnknown = await completeJson([
      { role: "system", content: synthesisSystemPrompt() },
      {
        role: "user",
        content: `Rewrite this Knowledge Hub topic so the overview and key points are complete enough to stand as the article. Use the source transcripts as the evidence. Expand thin summaries. Do not invent anything that was not said.

Existing topic title: ${topic.title}
Existing category: ${topic.category}
Existing summary (may be thin):
${topic.summary}
Existing key points (may be thin):
${existingKeyPoints.map((point) => `- ${point}`).join("\n") || "- (none)"}
Existing keywords: ${existingKeywords.join(", ") || "(none)"}

Source transcripts (the only allowed evidence):
${discussionBlocks.join("\n\n")}`,
      },
    ]);

    const parsed = synthesisResponseSchema.safeParse(parsedUnknown);
    if (!parsed.success) {
      if (options?.required) {
        throw new AppError(
          ErrorCodes.MALFORMED_LLM_JSON,
          "The model returned an unreadable rewrite. Try refreshing again.",
        );
      }
      return;
    }

    const keyPoints = uniqueStrings(parsed.data.key_points).slice(0, 14);
    const keywords = uniqueStrings([...existingKeywords, ...parsed.data.keywords]).slice(0, 16);
    const lastDiscussedAt = topic.discussions.reduce<Date | null>((latest, discussion) => {
      const date = discussion.meeting.meetingDate;
      if (!latest || date > latest) return date;
      return latest;
    }, topic.lastDiscussedAt);

    await prisma.topic.update({
      where: { id: topic.id },
      data: {
        summary: parsed.data.summary.trim(),
        keyPoints,
        keywords,
        lastDiscussedAt,
        searchText: buildSearchText({
          title: topic.title,
          category: topic.category,
          summary: parsed.data.summary.trim(),
          keyPoints,
          keywords,
        }),
      },
    });
  } catch (error) {
    if (options?.required) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        ErrorCodes.OPENAI_FAILURE,
        "The AI could not refresh this topic from the transcript. Try again in a moment.",
        502,
      );
    }

    logError("Topic synthesis failed; discussion was still attached", {
      topicId,
      code: error instanceof Error ? error.name : "UNKNOWN",
    });

    const lastDiscussedAt = topic.discussions.reduce<Date | null>((latest, discussion) => {
      const date = discussion.meeting.meetingDate;
      if (!latest || date > latest) return date;
      return latest;
    }, topic.lastDiscussedAt);

    await prisma.topic.update({
      where: { id: topic.id },
      data: { lastDiscussedAt },
    });
  }
}

function transcriptForDiscussion(discussion: {
  startSeconds: number;
  endSeconds: number | null;
  transcriptExcerpt: string;
  meeting: { transcript: string };
}) {
  const lines = parseTranscript(discussion.meeting.transcript);
  if (lines.length > 0) {
    const ranged = excerptForRange(
      lines,
      discussion.startSeconds,
      discussion.endSeconds,
      14_000,
    );
    if (ranged.trim()) return ranged;
  }

  const raw = discussion.meeting.transcript.trim();
  if (raw && raw.length <= 16_000) return raw;
  if (discussion.transcriptExcerpt.trim()) return discussion.transcriptExcerpt.trim();
  return raw.slice(0, 14_000);
}
