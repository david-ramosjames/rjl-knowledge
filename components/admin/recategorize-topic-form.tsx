import { recategorizeTopicAction } from "@/app/actions/topics";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_CATEGORIES } from "@/lib/categories";

export function RecategorizeTopicForm({
  topicId,
  category,
  returnTo,
}: {
  topicId: string;
  category: string;
  returnTo: string;
}) {
  const listId = `rjl-categories-${topicId}`;
  return (
    <form action={recategorizeTopicAction} className="flex w-full max-w-xl flex-col gap-2 sm:flex-row sm:items-end">
      <input type="hidden" name="topicId" value={topicId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <div className="min-w-0 flex-1 space-y-1">
        <Label htmlFor={`category-${topicId}`}>Category</Label>
        <Input
          id={`category-${topicId}`}
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
