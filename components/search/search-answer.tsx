"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { RichNote } from "@/components/articles/rich-note";
import { Badge } from "@/components/ui/badge";
import type { KnowledgeAskResult } from "@/lib/search/ask";

export function SearchAnswer({ query, category }: { query: string; category?: string }) {
  const [result, setResult] = useState<KnowledgeAskResult | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "hidden">("loading");

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setStatus("hidden");
      setResult(null);
      return;
    }

    let cancelled = false;
    setStatus("loading");
    setResult(null);

    fetch("/api/search/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q, category }),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("ask failed");
        return (await response.json()) as { result?: KnowledgeAskResult | null };
      })
      .then((payload) => {
        if (cancelled) return;
        if (!payload.result) {
          setStatus("hidden");
          return;
        }
        setResult(payload.result);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("hidden");
      });

    return () => {
      cancelled = true;
    };
  }, [query, category]);

  if (status === "hidden") return null;

  if (status === "loading") {
    return (
      <section className="mt-8 overflow-hidden rounded-2xl border border-border bg-white shadow-[0_8px_30px_rgba(28,25,23,0.04)]">
        <div className="flex items-center gap-3 border-b border-border bg-[color-mix(in_srgb,var(--primary)_6%,white)] px-5 py-3">
          <Sparkles className="size-4 text-accent" />
          <p className="text-sm font-medium text-primary">Reading the hub…</p>
        </div>
        <div className="space-y-3 px-5 py-5">
          <div className="h-4 w-11/12 animate-pulse rounded bg-muted" />
          <div className="h-4 w-10/12 animate-pulse rounded bg-muted" />
          <div className="h-4 w-8/12 animate-pulse rounded bg-muted" />
        </div>
      </section>
    );
  }

  if (!result) return null;

  return (
    <section className="mt-8 overflow-hidden rounded-2xl border border-border bg-white shadow-[0_12px_40px_rgba(11,35,65,0.06)]">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-[color-mix(in_srgb,var(--primary)_6%,white)] px-5 py-3">
        <div className="flex items-center gap-3">
          <Sparkles className="size-4 text-accent" />
          <p className="text-sm font-medium text-primary">
            {result.found ? "Answer from the hub" : "No clear match in the hub"}
          </p>
        </div>
        <Badge className="bg-white text-muted-foreground">Reads the articles</Badge>
      </div>
      <div className="px-5 py-5 sm:px-6">
        <div className="knowledge-prose text-[0.98rem] leading-7">
          <RichNote text={result.answer} />
        </div>
        {result.citations.length > 0 ? (
          <div className="mt-5 flex flex-wrap gap-2">
            {result.citations.map((citation) => (
              <Link
                key={`${citation.kind}-${citation.id}`}
                href={citation.href}
                className="inline-flex max-w-full items-center rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-foreground transition-colors hover:border-primary hover:bg-white"
              >
                <span className="truncate">{citation.title}</span>
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
