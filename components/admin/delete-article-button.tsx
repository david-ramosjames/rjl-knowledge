"use client";

import { deleteArticleAction } from "@/app/actions/documents";
import { SubmitButton } from "@/components/submit-button";

export function DeleteArticleButton({
  articleId,
  title,
  size = "sm",
}: {
  articleId: string;
  title: string;
  size?: "sm" | "default";
}) {
  return (
    <form
      action={deleteArticleAction}
      onSubmit={(event) => {
        if (!window.confirm(`Delete “${title}” from the Knowledge Hub? The original Dropbox or Drive file is not deleted.`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="articleId" value={articleId} />
      <SubmitButton variant="destructive" size={size} pendingLabel="Deleting…">
        Delete
      </SubmitButton>
    </form>
  );
}
