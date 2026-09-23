import type { ReactNode } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { KnowledgeCard } from "@/components/topics/knowledge-card";
import { ArticleFooterActions } from "@/components/knowledge/article-footer-actions";
import { OnThisPage } from "@/components/knowledge/on-this-page";
import { SourceActions } from "@/components/knowledge/source-actions";
import type { KnowledgeHeading } from "@/lib/knowledge/headings";
import type { KnowledgeSearchResult } from "@/lib/search";

export function KnowledgePage({
  backHref = "/",
  backLabel = "Knowledge Hub",
  category,
  kindLabel,
  title,
  updatedLabel,
  sourceUrl,
  fileName,
  headings,
  related,
  reportHref,
  adminHeader,
  adminFooter,
  children,
}: {
  backHref?: string;
  backLabel?: string;
  category: string;
  kindLabel: string;
  title: string;
  updatedLabel: string;
  sourceUrl?: string | null;
  fileName?: string | null;
  headings: KnowledgeHeading[];
  related: KnowledgeSearchResult[];
  reportHref: string;
  adminHeader?: ReactNode;
  adminFooter?: ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <header className="max-w-[840px]">
        <Link href={backHref} className="text-sm text-muted-foreground hover:text-foreground">
          ← {backLabel}
        </Link>
        <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-white">{category}</Badge>
              <Badge className="bg-muted">{kindLabel}</Badge>
            </div>
            <h1 className="mt-3 font-serif text-3xl leading-tight tracking-tight sm:text-4xl">{title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{updatedLabel}</p>
            <div className="mt-4">
              <SourceActions sourceUrl={sourceUrl} fileName={fileName} />
            </div>
          </div>
          {adminHeader}
        </div>
      </header>

      <div className="mt-8 grid items-start gap-10 lg:grid-cols-[minmax(0,840px)_16rem]">
        <div>
          <article className="knowledge-prose rounded-2xl border border-border bg-white px-5 py-8 sm:px-9 sm:py-10">
            {children}
          </article>
          <div className="mt-6 px-1">
            <ArticleFooterActions sourceUrl={sourceUrl} reportHref={reportHref} />
          </div>
          {adminFooter}
          {related.length > 0 ? (
            <section className="mt-12">
              <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Related knowledge
              </h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {related.map((item) => (
                  <KnowledgeCard
                    key={`${item.kind}-${item.id}`}
                    kind={item.kind}
                    title={item.title}
                    href={item.href}
                    category={item.category}
                    summary={item.summary}
                    lastDiscussedAt={item.lastDiscussedAt}
                    meta={item.meta}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>
        <aside className="hidden lg:block">
          <OnThisPage headings={headings} />
        </aside>
      </div>
    </main>
  );
}
