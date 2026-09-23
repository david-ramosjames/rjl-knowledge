import { prisma } from "@/lib/db/prisma";
import { CandidateStatus, MeetingStatus, TopicStatus } from "@/lib/generated/prisma/client";
import { synthesizeTopicFromDiscussions } from "@/lib/ai/synthesize";
import { AppError, ErrorCodes } from "@/lib/errors";
import { asStringArray, buildSearchText, normalizeTitle, slugify, uniqueStrings } from "@/lib/utils";

async function uniqueSlug(title: string) {
  const base = slugify(title);
  let slug = base;
  let suffix = 2;
  while (await prisma.topic.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
  return slug;
}

async function maybeMarkMeetingProcessed(meetingId: string) {
  const pending = await prisma.topicCandidate.count({
    where: { meetingId, status: CandidateStatus.PENDING },
  });
  if (pending > 0) return;

  await prisma.meeting.update({
    where: { id: meetingId },
    data: { status: MeetingStatus.PROCESSED, processingError: null },
  });
}

export async function updateCandidate(
  candidateId: string,
  data: {
    title: string;
    category: string;
    summary: string;
    keyPoints: string[];
    keywords: string[];
    startSeconds: number;
    endSeconds: number | null;
    speakers: string[];
    transcriptExcerpt: string;
  },
) {
  const candidate = await prisma.topicCandidate.findUnique({ where: { id: candidateId } });
  if (!candidate || candidate.status !== CandidateStatus.PENDING) {
    throw new AppError(ErrorCodes.VALIDATION, "Only pending topics can be edited.");
  }

  const existingTopics = await prisma.topic.findMany({
    where: { status: TopicStatus.APPROVED },
    select: {
      id: true,
      title: true,
      slug: true,
      category: true,
      keywords: true,
      normalizedTitle: true,
    },
  });

  const { findSuggestedTopic } = await import("@/lib/duplicates");
  const suggested = findSuggestedTopic(
    { title: data.title, keywords: data.keywords },
    existingTopics,
  );

  return prisma.topicCandidate.update({
    where: { id: candidateId },
    data: {
      title: data.title.trim(),
      category: data.category.trim() || "Other",
      summary: data.summary.trim(),
      keyPoints: uniqueStrings(data.keyPoints),
      keywords: uniqueStrings(data.keywords),
      startSeconds: data.startSeconds,
      endSeconds: data.endSeconds,
      speakers: uniqueStrings(data.speakers),
      transcriptExcerpt: data.transcriptExcerpt.trim(),
      suggestedTopicId: suggested?.id ?? null,
    },
  });
}

export async function ignoreCandidate(candidateId: string) {
  const candidate = await prisma.topicCandidate.findUnique({ where: { id: candidateId } });
  if (!candidate) throw new AppError(ErrorCodes.NOT_FOUND, "Topic not found.");
  if (candidate.status !== CandidateStatus.PENDING) {
    throw new AppError(ErrorCodes.VALIDATION, "Only pending topics can be ignored.");
  }

  await prisma.topicCandidate.update({
    where: { id: candidateId },
    data: { status: CandidateStatus.IGNORED },
  });

  await maybeMarkMeetingProcessed(candidate.meetingId);
}

export async function createTopicFromCandidate(candidateId: string) {
  const candidate = await prisma.topicCandidate.findUnique({
    where: { id: candidateId },
    include: { meeting: true },
  });
  if (!candidate) throw new AppError(ErrorCodes.NOT_FOUND, "Topic not found.");
  if (candidate.status !== CandidateStatus.PENDING) {
    throw new AppError(ErrorCodes.VALIDATION, "This topic has already been reviewed.");
  }

  const keyPoints = asStringArray(candidate.keyPoints);
  const keywords = asStringArray(candidate.keywords);
  const speakers = asStringArray(candidate.speakers);

  const slug = await uniqueSlug(candidate.title);

  const topic = await prisma.$transaction(async (tx) => {
    const created = await tx.topic.create({
      data: {
        title: candidate.title.trim(),
        slug,
        normalizedTitle: normalizeTitle(candidate.title),
        category: candidate.category,
        summary: candidate.summary,
        keyPoints,
        keywords,
        searchText: buildSearchText({
          title: candidate.title,
          category: candidate.category,
          summary: candidate.summary,
          keyPoints,
          keywords,
        }),
        status: TopicStatus.APPROVED,
        lastDiscussedAt: candidate.meeting.meetingDate,
      },
    });

    await tx.discussion.create({
      data: {
        topicId: created.id,
        meetingId: candidate.meetingId,
        startSeconds: candidate.startSeconds,
        endSeconds: candidate.endSeconds,
        sourceSummary: candidate.summary,
        transcriptExcerpt: candidate.transcriptExcerpt,
        speakers,
      },
    });

    await tx.topicCandidate.update({
      where: { id: candidate.id },
      data: {
        status: CandidateStatus.APPROVED,
        approvedTopicId: created.id,
      },
    });

    return created;
  });

  await synthesizeTopicFromDiscussions(topic.id);
  await maybeMarkMeetingProcessed(candidate.meetingId);
  return topic;
}

export async function addCandidateToExistingTopic(candidateId: string, topicId: string) {
  const candidate = await prisma.topicCandidate.findUnique({
    where: { id: candidateId },
    include: { meeting: true },
  });
  if (!candidate) throw new AppError(ErrorCodes.NOT_FOUND, "Topic not found.");
  if (candidate.status !== CandidateStatus.PENDING) {
    throw new AppError(ErrorCodes.VALIDATION, "This topic has already been reviewed.");
  }

  const topic = await prisma.topic.findUnique({ where: { id: topicId } });
  if (!topic || topic.status !== TopicStatus.APPROVED) {
    throw new AppError(ErrorCodes.NOT_FOUND, "Existing topic not found.");
  }

  const speakers = asStringArray(candidate.speakers);
  const incomingKeyPoints = asStringArray(candidate.keyPoints);
  const incomingKeywords = asStringArray(candidate.keywords);

  await prisma.$transaction(async (tx) => {
    await tx.discussion.create({
      data: {
        topicId: topic.id,
        meetingId: candidate.meetingId,
        startSeconds: candidate.startSeconds,
        endSeconds: candidate.endSeconds,
        sourceSummary: candidate.summary,
        transcriptExcerpt: candidate.transcriptExcerpt,
        speakers,
      },
    });

    const mergedKeyPoints = uniqueStrings([...asStringArray(topic.keyPoints), ...incomingKeyPoints]);
    const mergedKeywords = uniqueStrings([...asStringArray(topic.keywords), ...incomingKeywords]);
    const lastDiscussedAt =
      !topic.lastDiscussedAt || candidate.meeting.meetingDate > topic.lastDiscussedAt
        ? candidate.meeting.meetingDate
        : topic.lastDiscussedAt;

    await tx.topic.update({
      where: { id: topic.id },
      data: {
        keyPoints: mergedKeyPoints,
        keywords: mergedKeywords,
        lastDiscussedAt,
        searchText: buildSearchText({
          title: topic.title,
          category: topic.category,
          summary: topic.summary,
          keyPoints: mergedKeyPoints,
          keywords: mergedKeywords,
        }),
      },
    });

    await tx.topicCandidate.update({
      where: { id: candidate.id },
      data: {
        status: CandidateStatus.APPROVED,
        approvedTopicId: topic.id,
      },
    });
  });

  await synthesizeTopicFromDiscussions(topic.id);
  await maybeMarkMeetingProcessed(candidate.meetingId);
  return topic;
}

export async function getTopicBySlug(slug: string) {
  return prisma.topic.findUnique({
    where: { slug },
    include: {
      discussions: {
        include: { meeting: true },
        orderBy: { meeting: { meetingDate: "desc" } },
      },
    },
  });
}

export async function listTopicsForAdmin() {
  return prisma.topic.findMany({
    where: { status: TopicStatus.APPROVED },
    include: {
      _count: { select: { discussions: true } },
    },
    orderBy: [{ lastDiscussedAt: "desc" }, { updatedAt: "desc" }, { title: "asc" }],
  });
}

export async function deleteTopic(topicId: string) {
  const topic = await prisma.topic.findUnique({ where: { id: topicId } });
  if (!topic) {
    throw new AppError(ErrorCodes.NOT_FOUND, "Topic not found.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.topicCandidate.updateMany({
      where: { approvedTopicId: topic.id },
      data: { status: CandidateStatus.IGNORED, approvedTopicId: null },
    });
    await tx.topicCandidate.updateMany({
      where: { suggestedTopicId: topic.id },
      data: { suggestedTopicId: null },
    });
    await tx.topic.delete({ where: { id: topic.id } });
  });

  return topic;
}
