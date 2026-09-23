import { notFound } from "next/navigation";
import { DeleteTopicButton } from "@/components/admin/delete-topic-button";
import { RefreshTopicButton } from "@/components/admin/refresh-topic-button";
import { ErrorBanner } from "@/components/error-banner";
import { extractNoteHeadings, RichNote } from "@/components/articles/rich-note";
import { KnowledgePage } from "@/components/knowledge/knowledge-page";
import { DiscussionCard } from "@/components/topics/discussion-card";
import { isCurrentUserAdmin } from "@/lib/auth/admin";
import { getTopicBySlug } from "@/lib/db/topics";
import { headingId, type KnowledgeHeading } from "@/lib/knowledge/headings";
import { outdatedReportHref } from "@/lib/knowledge/report";
import { getRelatedKnowledge } from "@/lib/search";
import { asStringArray, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const topic = await getTopicBySlug(slug);
  return {
    title: topic?.title ?? "Topic",
  };
}

export default async function TopicPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const topic = await getTopicBySlug(slug);
  if (!topic || topic.status !== "APPROVED") notFound();
  const isAdmin = await isCurrentUserAdmin();

  const keyPoints = asStringArray(topic.keyPoints);
  const lastUpdated = topic.lastDiscussedAt ?? topic.updatedAt;
  const related = await getRelatedKnowledge({
    category: topic.category,
    excludeId: topic.id,
    excludeKind: "topic",
  });

  const used = new Set<string>();
  const headings: KnowledgeHeading[] = [];
  const addHeading = (title: string) => {
    const id = headingId(title, used);
    headings.push({ id, title, level: 2 });
    return id;
  };

  const keyPointsId = addHeading("Key points");
  const overviewId = addHeading("Overview");
  const overviewHeadingIds = new Set(used);
  headings.push(...extractNoteHeadings(topic.summary, used));
  const sourcesId = addHeading("Source discussions");

  return (
    <KnowledgePage
      category={topic.category}
      kindLabel="Meeting"
      title={topic.title}
      updatedLabel={`Updated ${formatDate(lastUpdated)}`}
      headings={headings}
      related={related}
      reportHref={outdatedReportHref(topic.title, `/topics/${topic.slug}`)}
      adminHeader={
        isAdmin ? (
          <div className="flex flex-wrap gap-2">
            <RefreshTopicButton topicId={topic.id} returnTo={`/topics/${topic.slug}`} />
            <DeleteTopicButton topicId={topic.id} title={topic.title} />
          </div>
        ) : null
      }
    >
      {query.error === "refresh" ? (
        <div className="mb-8">
          <ErrorBanner message="The AI could not rewrite this topic from the transcript. Try Refresh again in a moment." />
        </div>
      ) : null}

      <h2 id={keyPointsId}>Key points</h2>
      {keyPoints.length > 0 ? (
        <ul>
          {keyPoints.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      ) : (
        <p>No key points captured yet.</p>
      )}

      <h2 id={overviewId}>Overview</h2>
      <RichNote text={topic.summary} headingIds={overviewHeadingIds} />

      <h2 id={sourcesId}>Source discussions</h2>
      <p>
        Watch the clip or read the full transcript. The summary is only a guide — the source is
        what the firm actually said.
      </p>
      <div className="mt-6 space-y-4">
        {topic.discussions.map((discussion) => (
          <DiscussionCard
            key={discussion.id}
            meetingTitle={discussion.meeting.title}
            meetingDate={discussion.meeting.meetingDate}
            speakers={discussion.speakers}
            sourceSummary={discussion.sourceSummary}
            transcriptExcerpt={discussion.transcriptExcerpt}
            meetingTranscript={discussion.meeting.transcript}
            youtubeVideoId={discussion.meeting.youtubeVideoId}
            startSeconds={discussion.startSeconds}
            endSeconds={discussion.endSeconds}
          />
        ))}
      </div>
    </KnowledgePage>
  );
}
