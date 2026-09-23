import { refreshTopicAction } from "@/app/actions/topics";
import { SubmitButton } from "@/components/submit-button";

export function RefreshTopicButton({
  topicId,
  returnTo,
  size = "sm",
}: {
  topicId: string;
  returnTo: string;
  size?: "sm" | "default";
}) {
  return (
    <form action={refreshTopicAction}>
      <input type="hidden" name="topicId" value={topicId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <SubmitButton variant="outline" size={size} pendingLabel="Rewriting from transcript…">
        Refresh from transcript
      </SubmitButton>
    </form>
  );
}
