import { recategorizeTopicAction } from "@/app/actions/topics";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_CATEGORIES } from "@/lib/categories";

export function RecategorizeTopicForm({
  topicId,
  category,
  returnTo,
  idSuffix = "category",
}: {
  topicId: string;
  category: string;
  returnTo: string;
  idSuffix?: string;
}) {
  const fieldId = `category-${topicId}-${idSuffix}`;
  const listId = `rjl-categories-${topicId}-${idSuffix}`;
  return (
    <form
      action={recategorizeTopicAction}
      className="not-prose flex w-full max-w-xl flex-col gap-2 rounded-xl border border-border bg-muted/40 p-3 sm:flex-row sm:items-end"
    >
      <input type="hidden" name="topicId" value={topicId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <div className="min-w-0 flex-1 space-y-1">
        <Label htmlFor={fieldId}>Category</Label>
        <Input
          id={fieldId}
          name="category"
          list={listId}
          required
          defaultValue={category}
        />
        <datalist id={listId}>
          {DEFAULT_CATEGORIES.map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>
      </div>
      <SubmitButton variant="outline" size="sm" pendingLabel="Saving…">
        Save category
      </SubmitButton>
    </form>
  );
}
