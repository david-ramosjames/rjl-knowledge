import { generateBigCasesNote } from "@/lib/ai/big-cases";
import { upsertMeetingNoteArticle } from "@/lib/db/articles";
import { prisma } from "@/lib/db/prisma";
import { AppError, ErrorCodes } from "@/lib/errors";
import { logError, logInfo } from "@/lib/logger";
import { MeetingKind, MeetingStatus } from "@/lib/generated/prisma/client";

export async function processBigCasesMeeting(meetingId: string, options?: { force?: boolean }) {
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: { article: true },
  });

  if (!meeting) {
    throw new AppError(ErrorCodes.NOT_FOUND, "Meeting not found.", 404);
  }
  if (meeting.kind !== MeetingKind.BIG_CASES) {
    throw new AppError(ErrorCodes.VALIDATION, "This meeting is not a Big Cases review.");
  }
  if (!meeting.transcript.trim()) {
    throw new AppError(ErrorCodes.MISSING_TRANSCRIPT, "A transcript is required.");
  }

  if (!options?.force && meeting.article && meeting.status !== MeetingStatus.FAILED) {
    throw new AppError(
      ErrorCodes.DUPLICATE_PROCESSING,
      "This Big Cases meeting already has a note. Open the note or retry to rewrite it.",
      409,
      { meetingId: meeting.id },
    );
  }

  await prisma.meeting.update({
    where: { id: meeting.id },
    data: { status: MeetingStatus.PROCESSING, processingError: null },
  });

  try {
    logInfo("Writing Big Cases note from transcript", {
      meetingId: meeting.id,
      transcriptChars: meeting.transcript.length,
    });

    const note = await generateBigCasesNote({
      title: meeting.title,
      meetingDate: meeting.meetingDate.toISOString().slice(0, 10),
      participants: meeting.participants,
      transcript: meeting.transcript,
    });

    const article = await upsertMeetingNoteArticle({
      meetingId: meeting.id,
      title: note.title || meeting.title,
      summary: note.summary,
      body: note.body,
      keyPoints: note.keyPoints,
      keywords: note.keywords,
    });

    await prisma.meeting.update({
      where: { id: meeting.id },
      data: {
        status: MeetingStatus.PROCESSED,
        processedAt: new Date(),
        processingError: null,
      },
    });

    return { meetingId: meeting.id, topicCount: 0, articleSlug: article.slug };
  } catch (error) {
    const message =
      error instanceof AppError
        ? error.message
        : "Processing failed unexpectedly. The transcript is saved and you can retry.";

    logError("Big Cases note processing failed", {
      meetingId: meeting.id,
      code: error instanceof AppError ? error.code : "UNKNOWN",
    });

    await prisma.meeting.update({
      where: { id: meeting.id },
      data: {
        status: MeetingStatus.FAILED,
        processingError: message,
      },
    });

    throw error instanceof AppError ? error : new AppError(ErrorCodes.OPENAI_FAILURE, message, 502);
  }
}
