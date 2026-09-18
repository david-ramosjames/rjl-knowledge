import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { DiscussionCard } from "@/components/topics/discussion-card";
import { getTopicBySlug } from "@/lib/db/topics";
import { asStringArray, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

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
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const topic = await getTopicBySlug(slug);
  if (!topic || topic.status !== "APPROVED") notFound();

  const keyPoints = asStringArray(topic.keyPoints);
  const lastUpdated = topic.lastDiscussedAt ?? topic.updatedAt;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
      <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
        ← Knowledge hub
      </Link>
      <div className="mt-6">
        <Badge className="bg-white">{topic.category}</Badge>
        <h1 className="mt-4 font-serif text-4xl leading-tight tracking-tight sm:text-5xl">{topic.title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">Updated {formatDate(lastUpdated)}</p>
      </div>

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
        <p className="mt-4 text-base leading-8 text-foreground/90">{topic.summary}</p>
      </section>

      <section className="mt-12 pb-8">
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Source discussions
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Every claim on this page traces back to a meeting. Use the source discussion — and the
          recording when one exists — rather than treating the summary as independent advice.
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
              youtubeVideoId={discussion.meeting.youtubeVideoId}
              startSeconds={discussion.startSeconds}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
