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
            ? "The document was read, but the AI could not finish the article. Try again in a moment."
            : error === ErrorCodes.MALFORMED_LLM_JSON
              ? "The AI returned an unreadable article. Try ingesting the document again."
              : undefined
        }
      />

      <div className="space-y-2">
        <Label htmlFor="driveUrl">Google Drive link</Label>
        <Input
          id="driveUrl"
          name="driveUrl"
          required
          placeholder="https://drive.google.com/file/d/..."
        />
        <p className="text-xs leading-5 text-muted-foreground">
          Host the original in Drive. Share it so anyone with the link can view it. The AI will read
          the file and write the searchable article. Staff still download from Drive.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="file">Upload file for the AI to ingest</Label>
        <Input
          id="file"
          name="file"
          type="file"
          accept=".pdf,.doc,.docx,.txt,.md,.csv,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
        />
        <p className="text-xs leading-5 text-muted-foreground">
          Recommended for PDFs and Word files, or if Drive sharing is restricted. The AI uses this
          file to write the article.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="title">Title hint (optional)</Label>
          <Input id="title" name="title" placeholder="Leave blank and the AI will name it" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Category hint (optional)</Label>
          <Input id="category" name="category" list="rjl-categories" placeholder="AI will choose one" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="fileName">File name (optional)</Label>
        <Input id="fileName" name="fileName" placeholder="RJL-Naming-Conventions.pdf" />
      </div>

      <SubmitButton pendingLabel="Ingesting document and writing article…" size="lg">
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
