import { createDocumentArticleAction } from "@/app/actions/documents";
import { ErrorBanner } from "@/components/error-banner";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DEFAULT_CATEGORIES } from "@/lib/categories";
import { ErrorCodes } from "@/lib/errors";

export function DocumentForm({ error }: { error?: string | null }) {
  return (
    <form action={createDocumentArticleAction} className="space-y-6">
      <ErrorBanner
        code={error}
        message={
          error === ErrorCodes.VALIDATION
            ? "Title, a Google Drive link, and either the document text or an article body are required."
            : error === ErrorCodes.MISSING_TRANSCRIPT
              ? "Paste the document text, or write the article body, so the hub has something to search."
              : undefined
        }
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="title">Document title</Label>
          <Input id="title" name="title" required placeholder="File naming conventions" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Input id="category" name="category" list="rjl-categories" defaultValue="Firm Guides" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="driveUrl">Google Drive link</Label>
        <Input
          id="driveUrl"
          name="driveUrl"
          required
          placeholder="https://drive.google.com/file/d/..."
        />
        <p className="text-xs leading-5 text-muted-foreground">
          Host the original file in the firm’s Google Drive and paste a share link. Staff will
          download it from Drive.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="fileName">File name (optional)</Label>
        <Input id="fileName" name="fileName" placeholder="RJL-Naming-Conventions.pdf" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="sourceText">Document text</Label>
        <Textarea
          id="sourceText"
          name="sourceText"
          className="min-h-64 font-mono text-[13px] leading-6"
          placeholder="Paste the contents of the guide, naming convention, or handbook…"
        />
        <p className="text-xs leading-5 text-muted-foreground">
          Paste the document so the hub can write a searchable article. The Drive file stays the
          downloadable original.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="articleBody">Article body (optional)</Label>
        <Textarea
          id="articleBody"
          name="articleBody"
          className="min-h-40 text-sm leading-6"
          placeholder="Leave blank to have the hub draft the article from the pasted document text."
        />
      </div>

      <SubmitButton pendingLabel="Publishing article…" size="lg">
        Publish document
      </SubmitButton>

      <datalist id="rjl-categories">
        {DEFAULT_CATEGORIES.map((category) => (
          <option key={category} value={category} />
        ))}
      </datalist>
    </form>
  );
}
