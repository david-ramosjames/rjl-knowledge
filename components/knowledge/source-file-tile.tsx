"use client";

import { useState } from "react";
import { Download, FileText } from "lucide-react";
import { fileHostLabel, fileKindFromName } from "@/lib/file-links";

export function SourceFileTile({
  slug,
  sourceUrl,
  fileName,
}: {
  slug: string;
  sourceUrl?: string | null;
  fileName?: string | null;
}) {
  const [failed, setFailed] = useState(false);
  if (!sourceUrl && !fileName) return null;

  const kind = fileKindFromName(fileName);
  const host = fileHostLabel(sourceUrl);
  const label = fileName || `Open in ${host}`;
  const previewClassName =
    "relative block overflow-hidden rounded-xl border border-border bg-[#f4f1ee] shadow-[0_8px_24px_rgba(28,25,23,0.06)] transition-transform hover:-translate-y-0.5";

  const preview = (
    <div className="relative aspect-[3/4] bg-[linear-gradient(180deg,#ece7e2,#f7f4f1)]">
      {!failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/articles/${slug}/thumbnail`}
          alt=""
          className="absolute inset-[10px] h-[calc(100%-20px)] w-[calc(100%-20px)] rounded-[2px] bg-white object-cover object-top shadow-[0_1px_4px_rgba(28,25,23,0.12)]"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="absolute inset-[10px] flex flex-col items-center justify-center rounded-[2px] bg-white shadow-[0_1px_4px_rgba(28,25,23,0.12)]">
          <FileText className="size-8 text-primary/70" />
          <span className="mt-2 text-[10px] font-semibold tracking-wide text-muted-foreground">{kind}</span>
        </div>
      )}
      <span className="absolute bottom-2 left-2 rounded bg-primary/90 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
        {kind}
      </span>
    </div>
  );

  return (
    <div className="w-[148px] shrink-0">
      {sourceUrl ? (
        <a href={sourceUrl} target="_blank" rel="noreferrer" className={previewClassName}>
          {preview}
        </a>
      ) : (
        <div className={previewClassName}>{preview}</div>
      )}
      <p className="mt-2 truncate text-xs font-medium text-foreground" title={label}>
        {label}
      </p>
      {sourceUrl ? (
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          <a href={sourceUrl} target="_blank" rel="noreferrer" className="hover:text-foreground hover:underline">
            View source
          </a>
          <span aria-hidden="true">·</span>
          <a
            href={sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 hover:text-foreground"
          >
            <Download className="size-3" />
            Download
          </a>
        </div>
      ) : null}
    </div>
  );
}
