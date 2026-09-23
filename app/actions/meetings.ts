"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { processMeeting } from "@/lib/ai/process-meeting";
import { createMeetingRecord } from "@/lib/db/meetings";
import { errorCodeOf, errorMeetingIdOf, ErrorCodes } from "@/lib/errors";
import { parseParticipants } from "@/lib/utils";

function meetingErrorRedirect(code: string, extra?: Record<string, string>) {
  const params = new URLSearchParams({ error: code, ...extra });
  redirect(`/admin/meetings/new?${params.toString()}`);
}

export async function createAndProcessMeetingAction(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const meetingDateRaw = String(formData.get("meetingDate") ?? "").trim();
  const videoUrl = String(formData.get("videoUrl") ?? "").trim();
  const transcript = String(formData.get("transcript") ?? "").trim();
  const participants = parseParticipants(String(formData.get("participants") ?? ""));
  const kindRaw = String(formData.get("kind") ?? "KNOWLEDGE").trim();
  const kind = kindRaw === "BIG_CASES" ? "BIG_CASES" : "KNOWLEDGE";

  if (!title) meetingErrorRedirect(ErrorCodes.VALIDATION);
  if (!meetingDateRaw) meetingErrorRedirect(ErrorCodes.VALIDATION);
  if (!transcript) meetingErrorRedirect(ErrorCodes.MISSING_TRANSCRIPT);

  const meetingDate = new Date(`${meetingDateRaw}T12:00:00.000Z`);
  if (Number.isNaN(meetingDate.getTime())) meetingErrorRedirect(ErrorCodes.VALIDATION);

  let meetingId = "";
  let createError: string | null = null;
  let existingMeetingId: string | null = null;

  try {
    const meeting = await createMeetingRecord({
      title,
      meetingDate,
      videoUrl,
      transcript,
      participants,
      kind,
    });
    meetingId = meeting.id;
  } catch (error) {
    unstable_rethrow(error);
    existingMeetingId = errorMeetingIdOf(error) ?? null;
    createError = errorCodeOf(error) ?? ErrorCodes.DATABASE_FAILURE;
  }

  if (existingMeetingId) {
    redirect(`/admin/meetings/${existingMeetingId}`);
  }
  if (createError) {
    meetingErrorRedirect(createError);
  }

  let processError: string | null = null;
  let articleSlug = "";
  try {
    const result = await processMeeting(meetingId);
    articleSlug = result.articleSlug ?? "";
  } catch (error) {
    unstable_rethrow(error);
    const code = errorCodeOf(error);
    if (code !== ErrorCodes.DUPLICATE_PROCESSING) {
      processError = code ?? ErrorCodes.OPENAI_FAILURE;
    }
  }

  revalidatePath("/");
  revalidatePath("/search");
  revalidatePath("/admin");
  if (processError) {
    redirect(`/admin/meetings/${meetingId}?error=${processError}`);
  }
  if (articleSlug) {
    revalidatePath(`/articles/${articleSlug}`);
    redirect(`/articles/${articleSlug}`);
  }
  redirect(`/admin/meetings/${meetingId}/review`);
}

export async function retryProcessMeetingAction(formData: FormData) {
  const meetingId = String(formData.get("meetingId") ?? "").trim();
  if (!meetingId) redirect("/admin");

  let processError: string | null = null;
  let articleSlug = "";
  try {
    const result = await processMeeting(meetingId, { force: true });
    articleSlug = result.articleSlug ?? "";
  } catch (error) {
    unstable_rethrow(error);
    const code = errorCodeOf(error);
    if (code && code !== ErrorCodes.DUPLICATE_PROCESSING) {
      processError = code;
    } else if (!code) {
      processError = ErrorCodes.OPENAI_FAILURE;
    }
  }

  revalidatePath("/");
  revalidatePath("/search");
  revalidatePath("/admin");
  if (processError) {
    redirect(`/admin/meetings/${meetingId}?error=${processError}`);
  }
  if (articleSlug) {
    revalidatePath(`/articles/${articleSlug}`);
    redirect(`/articles/${articleSlug}`);
  }
  redirect(`/admin/meetings/${meetingId}/review`);
}
