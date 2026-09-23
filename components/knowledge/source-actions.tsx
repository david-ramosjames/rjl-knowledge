import { Download } from "lucide-react";
import { fileHostLabel } from "@/lib/file-links";

export function SourceActions({
  sourceUrl,
  fileName,
}: {
  sourceUrl?: string | null;
  fileName?: string | null;
}) {
  if (!sourceUrl) return null;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <a
          href={sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          View source
          <span aria-hidden="true">↗</span>
        </a>
        <a
          href={sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <Download className="size-3.5" />
          Download
        </a>
      </div>
      {fileName ? <p className="mt-1.5 text-xs text-muted-foreground">{fileName}</p> : (
        <p className="mt-1.5 text-xs text-muted-foreground">
          Opened from the firm’s {fileHostLabel(sourceUrl)}.
        </p>
      )}
    </div>
  );
}
