import { prisma } from "@/lib/db/prisma";
import { CandidateStatus, MeetingStatus } from "@/lib/generated/prisma/client";
import { AppError, ErrorCodes } from "@/lib/errors";
import { extractYouTubeVideoId, canonicalYouTubeUrl } from "@/lib/youtube";

export async function getAdminStats() {
  const [meetingsProcessed, topicsCreated, topicsAwaitingReview, recentMeetings] = await Promise.all([
    prisma.meeting.count({
      where: { status: { in: [MeetingStatus.PROCESSED, MeetingStatus.AWAITING_REVIEW] } },
    }),
    prisma.topic.count({ where: { status: "APPROVED" } }),
    prisma.topicCandidate.count({ where: { status: CandidateStatus.PENDING } }),
    prisma.meeting.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        _count: { select: { candidates: true, discussions: true } },
      },
    }),
  ]);

  return { meetingsProcessed, topicsCreated, topicsAwaitingReview, recentMeetings };
}

export async function getMeetingForReview(id: string) {
  return prisma.meeting.findUnique({
    where: { id },
    include: {
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
}) {
  const youtubeVideoId = extractYouTubeVideoId(input.videoUrl);
  if (!youtubeVideoId) {
    throw new AppError(ErrorCodes.INVALID_YOUTUBE_URL, "Paste a valid YouTube URL.");
  }
  if (!input.transcript.trim()) {
    throw new AppError(ErrorCodes.MISSING_TRANSCRIPT, "Paste a timestamped transcript.");
  }

  const existing = await prisma.meeting.findFirst({
    where: { youtubeVideoId },
    orderBy: { createdAt: "desc" },
  });

  if (existing) {
    throw new AppError(
      ErrorCodes.DUPLICATE_PROCESSING,
      `This YouTube video was already processed as “${existing.title}”. Open that meeting instead of creating a duplicate.`,
    );
  }

  try {
    return await prisma.meeting.create({
      data: {
        title: input.title.trim(),
        meetingDate: input.meetingDate,
        videoUrl: canonicalYouTubeUrl(youtubeVideoId),
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
      _count: { select: { candidates: true, discussions: true } },
    },
  });
}
