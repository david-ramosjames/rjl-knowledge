"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { processMeeting } from "@/lib/ai/process-meeting";
import { createMeetingRecord } from "@/lib/db/meetings";
import { AppError, ErrorCodes } from "@/lib/errors";
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

  if (!title) meetingErrorRedirect(ErrorCodes.VALIDATION);
  if (!meetingDateRaw) meetingErrorRedirect(ErrorCodes.VALIDATION);
  if (!transcript) meetingErrorRedirect(ErrorCodes.MISSING_TRANSCRIPT);

  const meetingDate = new Date(`${meetingDateRaw}T12:00:00.000Z`);
  if (Number.isNaN(meetingDate.getTime())) meetingErrorRedirect(ErrorCodes.VALIDATION);

  let meetingId = "";
  try {
    const meeting = await createMeetingRecord({
      title,
      meetingDate,
      videoUrl,
      transcript,
      participants,
    });
    meetingId = meeting.id;
  } catch (error) {
    if (error instanceof AppError) {
      meetingErrorRedirect(error.code);
    }
    meetingErrorRedirect(ErrorCodes.DATABASE_FAILURE);
  }

  try {
    await processMeeting(meetingId);
  } catch (error) {
    if (error instanceof AppError && error.code === ErrorCodes.DUPLICATE_PROCESSING) {
      redirect(`/admin/meetings/${meetingId}/review`);
    }
    redirect(`/admin/meetings/${meetingId}?error=${error instanceof AppError ? error.code : ErrorCodes.OPENAI_FAILURE}`);
  }

  revalidatePath("/");
  revalidatePath("/admin");
  redirect(`/admin/meetings/${meetingId}/review`);
}

export async function retryProcessMeetingAction(formData: FormData) {
  const meetingId = String(formData.get("meetingId") ?? "").trim();
  if (!meetingId) redirect("/admin");

  try {
    await processMeeting(meetingId, { force: true });
  } catch (error) {
    if (error instanceof AppError && error.code === ErrorCodes.DUPLICATE_PROCESSING) {
      redirect(`/admin/meetings/${meetingId}/review`);
    }
    redirect(
      `/admin/meetings/${meetingId}?error=${error instanceof AppError ? error.code : ErrorCodes.OPENAI_FAILURE}`,
    );
  }

  revalidatePath("/");
  revalidatePath("/admin");
  redirect(`/admin/meetings/${meetingId}/review`);
}
