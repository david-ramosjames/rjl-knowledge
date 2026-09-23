import { editArticleAction } from "@/app/actions/documents";
import { SubmitButton } from "@/components/submit-button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { LitEventRow } from "@/lib/utils";

export function EditArticleForm({
  articleId,
  summary,
  body,
  keyPoints,
  litEvents,
}: {
  articleId: string;
  summary: string;
  body: string;
  keyPoints: string[];
  litEvents: LitEventRow[];
}) {
  return (
    <form action={editArticleAction} className="space-y-5">
      <input type="hidden" name="articleId" value={articleId} />
      <div className="space-y-2">
        <Label htmlFor={`summary-${articleId}`}>Overview</Label>
        <Textarea id={`summary-${articleId}`} name="summary" required defaultValue={summary} rows={5} />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`keyPoints-${articleId}`}>Key points (one per line)</Label>
        <Textarea
          id={`keyPoints-${articleId}`}
          name="keyPoints"
          defaultValue={keyPoints.join("\n")}
          rows={5}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`litEvents-${articleId}`}>Tracker rows (Attorney | Case | Next step)</Label>
        <Textarea
          id={`litEvents-${articleId}`}
          name="litEvents"
          className="font-mono text-[13px] leading-6"
          defaultValue={litEvents
            .map((row) => `${row.attorney} | ${row.caseName} | ${row.nextStep}`)
            .join("\n")}
          rows={8}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`body-${articleId}`}>Note text</Label>
        <p className="text-xs text-muted-foreground">
          Use **double asterisks** around words you want bold. Change names here, then save.
        </p>
        <Textarea
          id={`body-${articleId}`}
          name="body"
          required
          className="min-h-80 font-mono text-[13px] leading-6"
          defaultValue={body}
        />
      </div>
      <SubmitButton pendingLabel="Saving edits…" size="lg">
        Save edits
      </SubmitButton>
    </form>
  );
}
