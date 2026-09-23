import Link from "next/link";
import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { DeleteArticleButton } from "@/components/admin/delete-article-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getArticleBySlug } from "@/lib/db/articles";
import { asStringArray, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  return {
    title: article?.title ?? "Document",
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article || article.status !== "APPROVED") notFound();

  const keyPoints = asStringArray(article.keyPoints);
  const paragraphs = article.body
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
      <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
        ← Knowledge Hub
      </Link>
      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-white">{article.category}</Badge>
            <Badge className="bg-muted">Document</Badge>
          </div>
          <h1 className="mt-4 font-serif text-4xl leading-tight tracking-tight sm:text-5xl">
            {article.title}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">Updated {formatDate(article.updatedAt)}</p>
        </div>
        <DeleteArticleButton articleId={article.id} title={article.title} />
      </div>

      <div className="mt-8">
        <Button asChild size="lg">
          <a href={article.driveUrl} target="_blank" rel="noreferrer">
            <Download className="size-4" />
            {article.fileName ? `Download ${article.fileName}` : "Open / download in Google Drive"}
          </a>
        </Button>
        <p className="mt-2 text-xs text-muted-foreground">
          The original file is hosted on the firm’s Google Drive.
        </p>
      </div>

      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Overview</h2>
        <p className="mt-4 text-base leading-8 text-foreground/90">{article.summary}</p>
      </section>

      {keyPoints.length > 0 ? (
        <section className="mt-12">
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Key points
          </h2>
          <ul className="mt-4 space-y-3 text-base leading-7">
            {keyPoints.map((point) => (
              <li key={point} className="flex gap-3">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-foreground" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-12 pb-8">
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Article</h2>
        <div className="mt-4 space-y-5 text-base leading-8 text-foreground/90">
          {paragraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 48)} className="whitespace-pre-wrap">
              {paragraph}
            </p>
          ))}
        </div>
      </section>
    </main>
  );
}
