"use client";

import { retryProcessMeetingAction } from "@/app/actions/meetings";
import { SubmitButton } from "@/components/submit-button";

export function RetryProcessButton({ meetingId }: { meetingId: string }) {
  return (
    <form action={retryProcessMeetingAction.bind(null, meetingId)}>
      <SubmitButton pendingLabel="Retrying…">Retry processing</SubmitButton>
    </form>
  );
}
