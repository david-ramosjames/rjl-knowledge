import { prisma } from "@/lib/db/prisma";
import { CandidateStatus, MeetingKind, MeetingStatus } from "@/lib/generated/prisma/client";
import { AppError, ErrorCodes } from "@/lib/errors";
import { extractYouTubeVideoId, canonicalYouTubeUrl } from "@/lib/youtube";

export async function getAdminStats() {
  const [meetingsProcessed, topicsCreated, topicsAwaitingReview, articlesPublished, recentMeetings] =
    await Promise.all([
      prisma.meeting.count({
        where: { status: { in: [MeetingStatus.PROCESSED, MeetingStatus.AWAITING_REVIEW] } },
      }),
      prisma.topic.count({ where: { status: "APPROVED" } }),
      prisma.topicCandidate.count({ where: { status: CandidateStatus.PENDING } }),
      prisma.article.count({ where: { status: "APPROVED" } }),
      prisma.meeting.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        include: {
          article: true,
          _count: { select: { candidates: true, discussions: true } },
        },
      }),
    ]);

  return { meetingsProcessed, topicsCreated, topicsAwaitingReview, articlesPublished, recentMeetings };
}

export async function getMeetingForReview(id: string) {
  return prisma.meeting.findUnique({
    where: { id },
    include: {
      article: true,
      candidates: {
        include: { suggestedTopic: true, approvedTopic: true },
        orderBy: { createdAt: "asc" },
      },
      discussions: {
        include: { topic: true },
      },
    },
  });
}

export async function createMeetingRecord(input: {
  title: string;
  meetingDate: Date;
  videoUrl: string;
  transcript: string;
  participants: string[];
  kind?: "KNOWLEDGE" | "BIG_CASES";
}) {
  if (!input.transcript.trim()) {
    throw new AppError(ErrorCodes.MISSING_TRANSCRIPT, "Paste a transcript.");
  }

  const trimmedUrl = input.videoUrl.trim();
  let youtubeVideoId: string | null = null;
  let videoUrl: string | null = null;

  if (trimmedUrl) {
    youtubeVideoId = extractYouTubeVideoId(trimmedUrl);
    if (!youtubeVideoId) {
      throw new AppError(ErrorCodes.INVALID_YOUTUBE_URL, "Paste a valid YouTube URL, or leave the video field blank.");
    }
    videoUrl = canonicalYouTubeUrl(youtubeVideoId);

    const existing = await prisma.meeting.findFirst({
      where: { youtubeVideoId },
      orderBy: { createdAt: "desc" },
    });

    if (existing) {
      throw new AppError(
        ErrorCodes.DUPLICATE_PROCESSING,
        `This YouTube video is already in the hub as “${existing.title}”.`,
        409,
        { meetingId: existing.id },
      );
    }
  }

  try {
    return await prisma.meeting.create({
      data: {
        title: input.title.trim(),
        meetingDate: input.meetingDate,
        kind: input.kind === "BIG_CASES" ? MeetingKind.BIG_CASES : MeetingKind.KNOWLEDGE,
        videoUrl,
        youtubeVideoId,
        transcript: input.transcript.trim(),
        participants: input.participants,
        status: MeetingStatus.DRAFT,
      },
    });
  } catch {
    throw new AppError(ErrorCodes.DATABASE_FAILURE, "Could not save the meeting. Try again.", 500);
  }
}

export async function listMeetings() {
  return prisma.meeting.findMany({
    orderBy: { meetingDate: "desc" },
    include: {
      article: true,
      _count: { select: { candidates: true, discussions: true } },
    },
  });
}
