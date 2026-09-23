"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { KnowledgeHeading } from "@/lib/knowledge/headings";

export function OnThisPage({ headings }: { headings: KnowledgeHeading[] }) {
  const [activeId, setActiveId] = useState(headings[0]?.id ?? "");

  useEffect(() => {
    if (headings.length === 0) return;

    const nodes = headings
      .map((heading) => document.getElementById(heading.id))
      .filter((node): node is HTMLElement => Boolean(node));
    if (nodes.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const id = visible[0]?.target.id;
        if (id) setActiveId(id);
      },
      { rootMargin: "-20% 0px -65% 0px", threshold: [0.1, 0.25, 0.5] },
    );

    for (const node of nodes) observer.observe(node);
    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <nav aria-label="On this page" className="sticky top-24">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        On this page
      </p>
      <ol className="mt-3 space-y-1 border-l border-border">
        {headings.map((heading) => (
          <li key={heading.id}>
            <a
              href={`#${heading.id}`}
              className={cn(
                "block border-l-2 py-1.5 text-sm leading-5 transition-colors",
                heading.level === 3 ? "pl-5" : "pl-3",
                activeId === heading.id
                  ? "-ml-px border-primary text-foreground"
                  : "-ml-px border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {heading.title}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
