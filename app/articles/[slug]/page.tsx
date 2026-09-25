import { notFound } from "next/navigation";
import { DeleteArticleButton } from "@/components/admin/delete-article-button";
import { RefreshArticleButton } from "@/components/admin/refresh-article-button";
import { EditArticleForm } from "@/components/admin/edit-article-form";
import { RenameArticleForm } from "@/components/admin/rename-article-form";
import { ErrorBanner } from "@/components/error-banner";
import { LitEventsTable } from "@/components/articles/lit-events-table";
import { extractNoteHeadings, InlineMarkdown, RichNote } from "@/components/articles/rich-note";
import { KnowledgePage } from "@/components/knowledge/knowledge-page";
import { DiscussionCard } from "@/components/topics/discussion-card";
import { isCurrentUserAdmin } from "@/lib/auth/admin";
import { getArticleBySlug } from "@/lib/db/articles";
import { ErrorCodes } from "@/lib/errors";
import { headingId, type KnowledgeHeading } from "@/lib/knowledge/headings";
import { outdatedReportHref } from "@/lib/knowledge/report";
import { articleKindLabel, trackerHeading } from "@/lib/meetings/kinds";
import { getRelatedKnowledge } from "@/lib/search";
import { asLitEvents, asStringArray, formatDate } from "@/lib/utils";

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
  const isAdmin = await isCurrentUserAdmin();

  const keyPoints = asStringArray(article.keyPoints);
  const litEvents = asLitEvents(article.litEvents);
  const related = await getRelatedKnowledge({
    category: article.category,
    excludeId: article.id,
    excludeKind: "article",
  });

  const used = new Set<string>();
  const headings: KnowledgeHeading[] = [];
  const addHeading = (title: string) => {
    const id = headingId(title, used);
    headings.push({ id, title, level: 2 });
    return id;
  };

  const overviewId = addHeading("Overview");
  const kindLabel = articleKindLabel({ category: article.category, meetingKind: article.meeting?.kind });
  const backHref = kindLabel === "New Cases" ? "/new-cases" : kindLabel === "Big Cases" ? "/big-cases" : "/documents";
  const trackerTitle = trackerHeading(article.category);
  const litEventsId = litEvents.length > 0 ? addHeading(trackerTitle) : null;
  const keyPointsId = keyPoints.length > 0 ? addHeading("Key points") : null;
  const bodyHeading = article.meeting ? "Monthly note" : "Article";
  const bodyId = addHeading(bodyHeading);
  const bodyHeadingIds = new Set(used);
  headings.push(...extractNoteHeadings(article.body, used));
  const sourceId = article.meeting ? addHeading("Source meeting") : null;

  return (
    <KnowledgePage
      backHref={backHref}
      backLabel={kindLabel === "Document" ? "Documents" : kindLabel}
      category={article.category}
      kindLabel={kindLabel}
      title={article.title}
      updatedLabel={`Updated ${formatDate(article.updatedAt)}`}
      sourceUrl={article.driveUrl}
      fileName={article.fileName}
      headings={headings}
      related={related}
      reportHref={outdatedReportHref(article.title, `/articles/${article.slug}`)}
      adminHeader={
        isAdmin ? (
          <div className="flex flex-wrap gap-2">
            <RefreshArticleButton articleId={article.id} />
            <DeleteArticleButton articleId={article.id} title={article.title} />
          </div>
        ) : null
      }
      adminFooter={
        isAdmin ? (
          <div className="mt-10 rounded-2xl border border-border bg-white px-5 py-8 sm:px-9">
            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Edit this note
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Fix names, next steps, or wording here. Saving does not re-run the AI.
            </p>
            <div className="mt-5">
              <EditArticleForm
                articleId={article.id}
                summary={article.summary}
                body={article.body}
                keyPoints={keyPoints}
                litEvents={litEvents}
              />
            </div>
          </div>
        ) : null
      }
    >
      {isAdmin ? (
        <div className="mb-8">
          <RenameArticleForm
            articleId={article.id}
            title={article.title}
            returnTo={`/articles/${article.slug}`}
          />
        </div>
      ) : null}

      {query.error ? (
        <div className="mb-8">
          <ErrorBanner
            code={query.error === "ingest" ? ErrorCodes.INGEST_FAILED : query.error === "refresh" ? ErrorCodes.OPENAI_FAILURE : query.error}
            message={
              query.error === "refresh"
                ? "The AI could not rewrite this article. Try Refresh again, or upload the file from Admin → Add document if the share link is not public."
                : query.error === "rename"
                  ? "Enter a title and try saving again."
                  : query.error === "edit"
                    ? "Summary and note text are required. Check the tracker rows use Attorney | Case | Next step."
                    : undefined
            }
          />
        </div>
      ) : null}

      <h2 id={overviewId}>Overview</h2>
      <RichNote text={article.summary} />

      {litEventsId ? (
        <LitEventsTable
          id={litEventsId}
          title={trackerTitle}
          stepLabel={article.category === "New Cases" ? "Next step" : "Lit event / next step"}
          rows={litEvents}
        />
      ) : null}

      {keyPointsId ? (
        <>
          <h2 id={keyPointsId}>Key points</h2>
          <ul>
            {keyPoints.map((point) => (
              <li key={point}>
                <InlineMarkdown text={point} />
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <h2 id={bodyId}>{bodyHeading}</h2>
      <RichNote text={article.body} headingIds={bodyHeadingIds} />

      {article.meeting && sourceId ? (
        <>
          <h2 id={sourceId}>Source meeting</h2>
          <DiscussionCard
            meetingTitle={article.meeting.title}
            meetingDate={article.meeting.meetingDate}
            speakers={article.meeting.participants}
            sourceSummary={`Watch or read the ${articleKindLabel({ category: article.category, meetingKind: article.meeting.kind })} review. The note above is the staff summary.`}
            transcriptExcerpt=""
            meetingTranscript={article.meeting.transcript}
            youtubeVideoId={article.meeting.youtubeVideoId}
            startSeconds={0}
          />
        </>
      ) : null}
    </KnowledgePage>
  );
}
