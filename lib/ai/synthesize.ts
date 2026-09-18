import { completeJson } from "@/lib/ai/openai";
import { synthesisSystemPrompt, synthesisResponseSchema } from "@/lib/ai/prompts";
import { prisma } from "@/lib/db/prisma";
import { logError } from "@/lib/logger";
import { asStringArray, buildSearchText, namedSpeakers, uniqueStrings } from "@/lib/utils";

export async function synthesizeTopicFromDiscussions(topicId: string) {
  const topic = await prisma.topic.findUnique({
    where: { id: topicId },
    include: {
      discussions: {
        include: { meeting: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!topic || topic.discussions.length === 0) return;

  const existingKeyPoints = asStringArray(topic.keyPoints);
  const existingKeywords = asStringArray(topic.keywords);

  const discussionBlocks = topic.discussions.map((discussion, index) => {
    const speakers = namedSpeakers(asStringArray(discussion.speakers)).join(", ");
    return `Source ${index + 1}
Meeting: ${discussion.meeting.title} (${discussion.meeting.meetingDate.toISOString().slice(0, 10)})
${speakers ? `Speakers: ${speakers}\n` : ""}Source summary: ${discussion.sourceSummary}
Excerpt: ${discussion.transcriptExcerpt}`;
  });

  try {
    const parsedUnknown = await completeJson([
      { role: "system", content: synthesisSystemPrompt() },
      {
        role: "user",
        content: `Existing topic title: ${topic.title}
Existing category: ${topic.category}
Existing summary: ${topic.summary}
Existing key points:
${existingKeyPoints.map((point) => `- ${point}`).join("\n")}
Existing keywords: ${existingKeywords.join(", ")}

Source discussions (the only allowed evidence):
${discussionBlocks.join("\n\n")}`,
      },
    ]);

    const parsed = synthesisResponseSchema.safeParse(parsedUnknown);
    if (!parsed.success) return;

    const keyPoints = uniqueStrings(parsed.data.key_points).slice(0, 10);
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
