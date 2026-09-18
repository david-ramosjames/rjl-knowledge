"use client";

import { deleteTopicAction } from "@/app/actions/topics";
import { SubmitButton } from "@/components/submit-button";

export function DeleteTopicButton({
  topicId,
  title,
  size = "sm",
}: {
  topicId: string;
  title: string;
  size?: "sm" | "default";
}) {
  return (
    <form
      action={deleteTopicAction}
      onSubmit={(event) => {
        if (!window.confirm(`Delete “${title}” from the Knowledge Hub? This cannot be undone.`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="topicId" value={topicId} />
      <SubmitButton variant="destructive" size={size} pendingLabel="Deleting…">
        Delete
      </SubmitButton>
    </form>
  );
}
