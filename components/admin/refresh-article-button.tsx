import { refreshArticleAction } from "@/app/actions/documents";
import { SubmitButton } from "@/components/submit-button";

export function RefreshArticleButton({
  articleId,
  size = "sm",
}: {
  articleId: string;
  size?: "sm" | "default";
}) {
  return (
    <form action={refreshArticleAction}>
      <input type="hidden" name="articleId" value={articleId} />
      <SubmitButton variant="outline" size={size} pendingLabel="Rewriting from document…">
        Refresh article
      </SubmitButton>
    </form>
  );
}
