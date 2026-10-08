import { createDocumentArticleAction } from "@/app/actions/documents";
import { ErrorBanner } from "@/components/error-banner";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_CATEGORIES } from "@/lib/categories";
import { ErrorCodes } from "@/lib/errors";

export function DocumentForm({ error }: { error?: string | null }) {
  return (
    <form action={createDocumentArticleAction} className="space-y-6">
      <ErrorBanner
        code={error}
        message={
          error === ErrorCodes.OPENAI_FAILURE
            ? "The source was read, but the AI could not finish the article. Try again in a moment."
            : error === ErrorCodes.MALFORMED_LLM_JSON
              ? "The AI returned an unreadable article. Try ingesting again."
              : error === ErrorCodes.VALIDATION
                ? "Add a Dropbox/Drive link, upload a document, or upload slide screenshots."
                : undefined
        }
      />

      <div className="space-y-2">
        <Label htmlFor="slides">Slide screenshots</Label>
        <Input
          id="slides"
          name="slides"
          type="file"
          accept=".jpg,.jpeg,.png,.webp,.gif,image/jpeg,image/png,image/webp,image/gif"
          multiple
        />
        <p className="text-xs leading-5 text-muted-foreground">
          Use this when there is no transcript — for example PI Mastermind slides. Select the
          screenshots in order (up to 16). The AI reads the pictures and writes the article. The
          hub also keeps the slides on the page.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="driveUrl">Dropbox or Google Drive link (optional)</Label>
        <Input
          id="driveUrl"
          name="driveUrl"
          placeholder="https://www.dropbox.com/scl/fi/..."
        />
        <p className="text-xs leading-5 text-muted-foreground">
          For Word/PDF guides, host the original in Dropbox or Drive and share it so anyone with
          the link can view it. Not required for slide screenshots.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="file">Upload a document for the AI (optional)</Label>
        <Input
          id="file"
          name="file"
          type="file"
          accept=".pdf,.doc,.docx,.txt,.md,.csv,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
        />
        <p className="text-xs leading-5 text-muted-foreground">
          Recommended for PDFs and Word files, or if the share link is restricted.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="title">Title hint (optional)</Label>
          <Input id="title" name="title" placeholder="PI Mastermind — session date" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Category hint (optional)</Label>
          <Input id="category" name="category" list="rjl-categories" placeholder="PI Mastermind" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="fileName">File name (optional)</Label>
        <Input id="fileName" name="fileName" placeholder="RJL-Naming-Conventions.pdf" />
      </div>

      <SubmitButton pendingLabel="Ingesting and writing article…" size="lg">
        Ingest and publish
      </SubmitButton>

      <datalist id="rjl-categories">
        {DEFAULT_CATEGORIES.map((category) => (
          <option key={category} value={category} />
        ))}
      </datalist>
    </form>
  );
}
