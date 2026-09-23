"use client";

import { useState } from "react";

export function ArticleFooterActions({
  sourceUrl,
  reportHref,
}: {
  sourceUrl?: string | null;
  reportHref: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
      {sourceUrl ? (
        <>
          <a href={sourceUrl} target="_blank" rel="noreferrer" className="hover:text-foreground hover:underline">
            View source
          </a>
          <span aria-hidden="true">·</span>
        </>
      ) : null}
      <button type="button" onClick={copyLink} className="hover:text-foreground hover:underline">
        {copied ? "Link copied" : "Copy link"}
      </button>
      <span aria-hidden="true">·</span>
      <a href={reportHref} className="hover:text-foreground hover:underline">
        Report outdated information
      </a>
    </div>
  );
}
