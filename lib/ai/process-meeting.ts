import { DEFAULT_CATEGORIES, normalizeCategory } from "@/lib/categories";
import { prisma } from "@/lib/db/prisma";
import { AppError, ErrorCodes } from "@/lib/errors";
import { logError, logInfo } from "@/lib/logger";
import { excerptForRange, parseTranscript } from "@/lib/transcript/parse";
import { namedSpeakers, normalizeTitle, uniqueStrings } from "@/lib/utils";
import { findSuggestedTopic } from "@/lib/duplicates";
import {
  completeJson,
  extractJsonObject,
  getOpenAIClient,
  getOpenAIModel,
} from "@/lib/ai/openai";
import { isLastingKnowledge } from "@/lib/ai/lasting-knowledge";
import {
  extractionExpansionUserPrompt,
  extractionRecoveryUserPrompt,
  extractionResponseSchema,
  extractionSystemPrompt,
  extractionUserPrompt,
  type ExtractedDiscussion,
} from "@/lib/ai/prompts";
import { CandidateStatus, MeetingStatus } from "@/lib/generated/prisma/client";

export async function processMeeting(meetingId: string, options?: { force?: boolean }) {
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: {
      candidates: true,
    },
  });

  if (!meeting) {
    throw new AppError(ErrorCodes.NOT_FOUND, "Meeting not found.", 404);
  }

  const force = Boolean(options?.force);
  const approvedOrPending = meeting.candidates.filter(
    (candidate) => candidate.status === CandidateStatus.PENDING || candidate.status === CandidateStatus.APPROVED,
  );

  if (!force && approvedOrPending.length > 0 && meeting.status !== MeetingStatus.FAILED) {
    throw new AppError(
      ErrorCodes.DUPLICATE_PROCESSING,
      "This meeting already has extracted topics. Open the review screen instead of processing it again.",
      409,
      { meetingId: meeting.id },
    );
  }

  if (force) {
    await prisma.topicCandidate.deleteMany({
      where: { meetingId: meeting.id, status: CandidateStatus.PENDING },
    });
  }

  if (!meeting.transcript.trim()) {
    throw new AppError(ErrorCodes.MISSING_TRANSCRIPT, "A timestamped transcript is required.");
  }

  await prisma.meeting.update({
    where: { id: meeting.id },
    data: {
      status: MeetingStatus.PROCESSING,
      processingError: null,
    },
  });

  try {
    logInfo("Sending meeting transcript to OpenAI", {
      meetingId: meeting.id,
      transcriptChars: meeting.transcript.length,
      force,
    });
    const discussions = await extractDiscussions({
      title: meeting.title,
      meetingDate: meeting.meetingDate.toISOString().slice(0, 10),
      participants: meeting.participants,
      transcript: meeting.transcript,
    });

    const lines = parseTranscript(meeting.transcript);
    const existingTopics = await prisma.topic.findMany({
      where: { status: "APPROVED" },
      select: {
        id: true,
        title: true,
        slug: true,
        category: true,
        keywords: true,
        normalizedTitle: true,
      },
    });

    await prisma.topicCandidate.deleteMany({
      where: { meetingId: meeting.id, status: CandidateStatus.PENDING },
    });

    for (const discussion of discussions) {
      const startSeconds = Math.max(0, discussion.start_seconds);
      const endSeconds =
        discussion.end_seconds && discussion.end_seconds > startSeconds ? discussion.end_seconds : null;
      const excerpt =
        discussion.transcript_excerpt.trim() || excerptForRange(lines, startSeconds, endSeconds);
      const keywords = uniqueStrings(discussion.keywords);
      const suggested = findSuggestedTopic(
        {
          title: discussion.title,
          keywords,
        },
        existingTopics,
      );

      await prisma.topicCandidate.create({
        data: {
          meetingId: meeting.id,
          title: discussion.title.trim(),
          category: normalizeCategory(discussion.category),
          summary: discussion.summary.trim(),
          keyPoints: uniqueStrings(discussion.key_points),
          keywords,
          startSeconds,
          endSeconds,
          speakers: namedSpeakers(discussion.speakers.length ? discussion.speakers : meeting.participants),
          transcriptExcerpt: excerpt,
          suggestedTopicId: suggested?.id ?? null,
        },
      });
    }

    await prisma.meeting.update({
      where: { id: meeting.id },
      data: {
        status: MeetingStatus.AWAITING_REVIEW,
        processedAt: new Date(),
        processingError:
          discussions.length === 0
            ? "No knowledge topics were found. If this meeting had legal or practice discussion, retry processing."
            : null,
      },
    });

    return { meetingId: meeting.id, topicCount: discussions.length };
  } catch (error) {
    const message =
      error instanceof AppError
        ? error.message
        : "Processing failed unexpectedly. The transcript is saved and you can retry.";

    logError("Meeting processing failed", {
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

    throw error instanceof AppError
      ? error
      : new AppError(ErrorCodes.OPENAI_FAILURE, message, 502);
  }
}

async function extractDiscussions(input: {
  title: string;
  meetingDate: string;
  participants: string[];
  transcript: string;
}): Promise<ExtractedDiscussion[]> {
  const firstPass = await runExtraction([
    { role: "system", content: extractionSystemPrompt() },
    { role: "user", content: extractionUserPrompt(input) },
  ]);

  if (firstPass.length >= 8) {
    logInfo("Extracted meeting topics", { count: firstPass.length, pass: "primary" });
    return firstPass;
  }

  const followUpPrompt =
    firstPass.length === 0
      ? extractionRecoveryUserPrompt(input)
      : extractionExpansionUserPrompt(
          input,
          firstPass.map((discussion) => discussion.title),
        );
  const followUp = await runExtraction([
    { role: "system", content: extractionSystemPrompt() },
    { role: "user", content: followUpPrompt },
  ]);
  const merged = mergeDiscussions(firstPass, followUp);
  logInfo("Extracted meeting topics", {
    count: merged.length,
    pass: firstPass.length === 0 ? "recovery" : "expansion",
    primaryCount: firstPass.length,
    followUpCount: followUp.length,
  });
  return merged;
}

async function runExtraction(messages: { role: "system" | "user"; content: string }[]) {
  let parsedUnknown: unknown;
  try {
    parsedUnknown = await completeJson(messages);
  } catch (error) {
    if (!(error instanceof AppError) || error.code !== ErrorCodes.MALFORMED_LLM_JSON) {
      throw error;
    }
    parsedUnknown = await retryRawCompletion(messages);
  }

  const parsed = extractionResponseSchema.safeParse(normalizeExtractionPayload(parsedUnknown));
  if (!parsed.success) {
    throw new AppError(
      ErrorCodes.MALFORMED_LLM_JSON,
      "The model returned topic data that did not match the expected shape. The meeting was saved — retry processing.",
    );
  }

  const rawCount = parsed.data.discussions.length;
  const kept = parsed.data.discussions
    .map((discussion) => ({
      ...discussion,
      category: normalizeExtractedCategory(discussion.category),
      key_points: uniqueStrings(discussion.key_points).slice(0, 8),
      keywords: uniqueStrings(discussion.keywords).slice(0, 12),
      speakers: namedSpeakers(discussion.speakers),
    }))
    .filter((discussion) => discussion.title.trim() && discussion.summary.trim() && isLastingKnowledge(discussion));

  logInfo("OpenAI topic extraction result", { rawCount, keptCount: kept.length });
  return kept;
}

function mergeDiscussions(primary: ExtractedDiscussion[], extra: ExtractedDiscussion[]) {
  const merged: ExtractedDiscussion[] = [];
  const seen = new Set<string>();
  for (const discussion of [...primary, ...extra]) {
    const key = normalizeTitle(discussion.title);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(discussion);
  }
  return merged;
}

function normalizeExtractedCategory(category: string) {
  const normalized = normalizeCategory(category);
  const preferred = DEFAULT_CATEGORIES.find((item) => item.toLowerCase() === normalized.toLowerCase());
  return preferred ?? normalized;
}

function normalizeExtractionPayload(payload: unknown) {
  if (payload && typeof payload === "object" && "discussions" in payload) {
    return payload;
  }
  if (Array.isArray(payload)) {
    return { discussions: payload };
  }
  if (payload && typeof payload === "object" && "topics" in payload) {
    return { discussions: (payload as { topics: unknown }).topics };
  }
  return { discussions: [] };
}

async function retryRawCompletion(messages: { role: "system" | "user"; content: string }[]) {
  const client = getOpenAIClient();
  try {
    const completion = await client.chat.completions.create({
      model: getOpenAIModel(),
      temperature: 0,
      messages: [
        ...messages,
        {
          role: "user",
          content: "Return only valid JSON matching the required schema. No markdown.",
        },
      ],
    });
    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new AppError(
        ErrorCodes.MALFORMED_LLM_JSON,
        "The model returned an empty response on retry. The meeting was saved — retry processing.",
      );
    }
    return extractJsonObject(content);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      ErrorCodes.OPENAI_FAILURE,
      "OpenAI processing failed. The meeting transcript was saved and you can retry.",
      502,
    );
  }
}
