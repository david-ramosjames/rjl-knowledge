import { renameArticleAction } from "@/app/actions/documents";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RenameArticleForm({
  articleId,
  title,
  returnTo,
}: {
  articleId: string;
  title: string;
  returnTo: string;
}) {
  return (
    <form action={renameArticleAction} className="flex w-full max-w-xl flex-col gap-2 sm:flex-row sm:items-end">
      <input type="hidden" name="articleId" value={articleId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <div className="min-w-0 flex-1 space-y-1">
        <Label htmlFor={`rename-${articleId}`} className="sr-only">
          Article title
        </Label>
        <Input id={`rename-${articleId}`} name="title" required defaultValue={title} />
      </div>
      <SubmitButton variant="outline" size="sm" pendingLabel="Saving…">
        Save title
      </SubmitButton>
    </form>
  );
}
