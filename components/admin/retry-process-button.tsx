"use client";

import { retryProcessMeetingAction } from "@/app/actions/meetings";
import { SubmitButton } from "@/components/submit-button";

export function RetryProcessButton({ meetingId }: { meetingId: string }) {
  return (
    <form action={retryProcessMeetingAction}>
      <input type="hidden" name="meetingId" value={meetingId} />
      <SubmitButton pendingLabel="Sending transcript to OpenAI…">Retry processing</SubmitButton>
    </form>
  );
}
