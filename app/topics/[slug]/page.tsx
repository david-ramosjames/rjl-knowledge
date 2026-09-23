import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteTopicButton } from "@/components/admin/delete-topic-button";
import { RefreshTopicButton } from "@/components/admin/refresh-topic-button";
import { ErrorBanner } from "@/components/error-banner";
import { Badge } from "@/components/ui/badge";
import { DiscussionCard } from "@/components/topics/discussion-card";
import { isCurrentUserAdmin } from "@/lib/auth/admin";
import { getTopicBySlug } from "@/lib/db/topics";
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
  const summaryParagraphs = topic.summary
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
          <Badge className="bg-white">{topic.category}</Badge>
          <h1 className="mt-4 font-serif text-4xl leading-tight tracking-tight sm:text-5xl">{topic.title}</h1>
          <p className="mt-3 text-sm text-muted-foreground">Updated {formatDate(lastUpdated)}</p>
        </div>
        {isAdmin ? (
          <div className="flex flex-wrap gap-2">
            <RefreshTopicButton topicId={topic.id} returnTo={`/topics/${topic.slug}`} />
            <DeleteTopicButton topicId={topic.id} title={topic.title} />
          </div>
        ) : null}
      </div>

      {query.error === "refresh" ? (
        <div className="mt-6">
          <ErrorBanner message="The AI could not rewrite this topic from the transcript. Try Refresh again in a moment." />
        </div>
      ) : null}

      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Key points</h2>
        {keyPoints.length > 0 ? (
          <ul className="mt-4 space-y-3 text-base leading-7">
            {keyPoints.map((point) => (
              <li key={point} className="flex gap-3">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-foreground" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">No key points captured yet.</p>
        )}
      </section>

      <section className="mt-12">
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Overview</h2>
        <div className="mt-4 space-y-4">
          {summaryParagraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 48)} className="text-base leading-8 text-foreground/90 whitespace-pre-wrap">
              {paragraph}
            </p>
          ))}
        </div>
      </section>

      <section className="mt-12 pb-8">
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Source discussions
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
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
      </section>
    </main>
  );
}
