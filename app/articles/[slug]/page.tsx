import Link from "next/link";
import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { DeleteArticleButton } from "@/components/admin/delete-article-button";
import { RefreshArticleButton } from "@/components/admin/refresh-article-button";
import { RenameArticleForm } from "@/components/admin/rename-article-form";
import { ErrorBanner } from "@/components/error-banner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DiscussionCard } from "@/components/topics/discussion-card";
import { getArticleBySlug } from "@/lib/db/articles";
import { ErrorCodes } from "@/lib/errors";
import { fileHostLabel } from "@/lib/file-links";
import { asStringArray, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

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
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
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
            <Badge className="bg-muted">{article.meeting ? "Big Cases" : "Document"}</Badge>
          </div>
          <h1 className="mt-4 font-serif text-4xl leading-tight tracking-tight sm:text-5xl">
            {article.title}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">Updated {formatDate(article.updatedAt)}</p>
          <div className="mt-4">
            <RenameArticleForm
              articleId={article.id}
              title={article.title}
              returnTo={`/articles/${article.slug}`}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <RefreshArticleButton articleId={article.id} />
          <DeleteArticleButton articleId={article.id} title={article.title} />
        </div>
      </div>

      {query.error ? (
        <div className="mt-6">
          <ErrorBanner
            code={query.error === "ingest" ? ErrorCodes.INGEST_FAILED : query.error === "refresh" ? ErrorCodes.OPENAI_FAILURE : query.error}
            message={
              query.error === "refresh"
                ? "The AI could not rewrite this article. Try Refresh again, or upload the file from Admin → Add document if the share link is not public."
                : query.error === "rename"
                  ? "Enter a title and try saving again."
                  : undefined
            }
          />
        </div>
      ) : null}

      {article.driveUrl ? (
        <div className="mt-8">
          <Button asChild size="lg">
            <a href={article.driveUrl} target="_blank" rel="noreferrer">
              <Download className="size-4" />
              {article.fileName
                ? `Download ${article.fileName}`
                : `Open / download in ${fileHostLabel(article.driveUrl)}`}
            </a>
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            The original file is hosted on the firm’s {fileHostLabel(article.driveUrl)}.
          </p>
        </div>
      ) : null}

      {article.meeting ? (
        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Source meeting
          </h2>
          <div className="mt-4">
            <DiscussionCard
              meetingTitle={article.meeting.title}
              meetingDate={article.meeting.meetingDate}
              speakers={article.meeting.participants}
              sourceSummary="Watch or read the monthly Big Cases review. The note below is the staff summary."
              transcriptExcerpt=""
              meetingTranscript={article.meeting.transcript}
              youtubeVideoId={article.meeting.youtubeVideoId}
              startSeconds={0}
            />
          </div>
        </section>
      ) : null}

      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Overview</h2>
        <div className="mt-4 space-y-4">
          {article.summary
            .split(/\n{2,}/)
            .map((part) => part.trim())
            .filter(Boolean)
            .map((paragraph) => (
              <p key={paragraph.slice(0, 48)} className="text-base leading-8 text-foreground/90 whitespace-pre-wrap">
                {paragraph}
              </p>
            ))}
        </div>
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
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {article.meeting ? "Monthly note" : "Article"}
        </h2>
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
