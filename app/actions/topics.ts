"use server";

import { revalidatePath } from "next/cache";
import {
  addCandidateToExistingTopic,
  createTopicFromCandidate,
  ignoreCandidate,
  updateCandidate,
} from "@/lib/db/topics";
import { AppError } from "@/lib/errors";
import { parseParticipants } from "@/lib/utils";
import { parseTimestampToSeconds } from "@/lib/youtube";

function parsePoints(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-•]\s*/, "").trim())
    .filter(Boolean);
}

export async function editCandidateAction(formData: FormData) {
  const candidateId = String(formData.get("candidateId") ?? "");
  const meetingId = String(formData.get("meetingId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim();
  const startRaw = String(formData.get("startTimestamp") ?? "").trim();
  const endRaw = String(formData.get("endTimestamp") ?? "").trim();
  const startSeconds = parseTimestampToSeconds(startRaw);
  const endSeconds = endRaw ? parseTimestampToSeconds(endRaw) : null;

  if (!candidateId || !title || !summary || startSeconds === null) {
    return { ok: false, error: "Title, summary, and a valid start timestamp are required." };
  }

  try {
    await updateCandidate(candidateId, {
      title,
      category,
      summary,
      keyPoints: parsePoints(String(formData.get("keyPoints") ?? "")),
      keywords: parseParticipants(String(formData.get("keywords") ?? "")),
      startSeconds,
      endSeconds,
      speakers: parseParticipants(String(formData.get("speakers") ?? "")),
      transcriptExcerpt: String(formData.get("transcriptExcerpt") ?? ""),
    });
    revalidatePath(`/admin/meetings/${meetingId}/review`);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof AppError ? error.message : "Could not save edits.",
    };
  }
}

export async function approveNewTopicAction(formData: FormData) {
  const candidateId = String(formData.get("candidateId") ?? "");
  const meetingId = String(formData.get("meetingId") ?? "");
  try {
    const topic = await createTopicFromCandidate(candidateId);
    revalidatePath("/");
    revalidatePath("/search");
    revalidatePath(`/topics/${topic.slug}`);
    revalidatePath("/admin");
    revalidatePath(`/admin/meetings/${meetingId}/review`);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof AppError ? error.message : "Could not approve this topic.",
    };
  }
}

export async function addToExistingTopicAction(formData: FormData) {
  const candidateId = String(formData.get("candidateId") ?? "");
  const topicId = String(formData.get("topicId") ?? "");
  const meetingId = String(formData.get("meetingId") ?? "");
  if (!topicId) {
    return { ok: false, error: "Choose an existing topic first." };
  }
  try {
    const topic = await addCandidateToExistingTopic(candidateId, topicId);
    revalidatePath("/");
    revalidatePath("/search");
    revalidatePath(`/topics/${topic.slug}`);
    revalidatePath("/admin");
    revalidatePath(`/admin/meetings/${meetingId}/review`);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof AppError ? error.message : "Could not attach this discussion.",
    };
  }
}

export async function ignoreCandidateAction(formData: FormData) {
  const candidateId = String(formData.get("candidateId") ?? "");
  const meetingId = String(formData.get("meetingId") ?? "");
  try {
    await ignoreCandidate(candidateId);
    revalidatePath("/admin");
    revalidatePath(`/admin/meetings/${meetingId}/review`);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof AppError ? error.message : "Could not ignore this topic.",
    };
  }
}
