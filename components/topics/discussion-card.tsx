import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { asStringArray, namedSpeakers, formatDate } from "@/lib/utils";
import { formatTimestamp, youtubeEmbedUrl } from "@/lib/youtube";

export function DiscussionCard({
  meetingTitle,
  meetingDate,
  speakers,
  sourceSummary,
  transcriptExcerpt,
  youtubeVideoId,
  startSeconds,
}: {
  meetingTitle: string;
  meetingDate: Date;
  speakers: unknown;
  sourceSummary: string;
  transcriptExcerpt: string;
  youtubeVideoId: string | null;
  startSeconds: number;
}) {
  const speakerList = namedSpeakers(asStringArray(speakers));
  const embedUrl = youtubeVideoId ? youtubeEmbedUrl(youtubeVideoId, startSeconds) : null;
  const showTimestamp = Boolean(embedUrl) || startSeconds > 0;

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-sm font-medium text-muted-foreground">{formatDate(meetingDate)}</div>
          <h3 className="mt-1 text-lg font-semibold tracking-tight">{meetingTitle}</h3>
          {speakerList.length > 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">{speakerList.join(", ")}</p>
          ) : null}
        </div>
        <Badge className="bg-white">{embedUrl ? "Source discussion" : "Transcript source"}</Badge>
      </div>
      <p className="mt-4 text-sm leading-7 text-foreground/90">{sourceSummary}</p>
      {embedUrl ? (
        <div className="mt-5 overflow-hidden rounded-xl border border-border bg-black">
          <div className="relative aspect-video">
            <iframe
              src={embedUrl}
              title={`${meetingTitle} at ${formatTimestamp(startSeconds)}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="absolute inset-0 h-full w-full"
            />
          </div>
          <p className="bg-primary px-4 py-2 text-xs text-primary-foreground">
            Starts at {formatTimestamp(startSeconds)}. Click play to watch this part of the meeting.
          </p>
        </div>
      ) : showTimestamp ? (
        <p className="mt-5 inline-flex items-center gap-2 text-sm text-muted-foreground">
          <FileText className="size-4" />
          In transcript at {formatTimestamp(startSeconds)}
        </p>
      ) : null}
      {transcriptExcerpt ? (
        <blockquote className="mt-5 border-l-2 border-border pl-4 text-sm leading-7 text-muted-foreground">
          {transcriptExcerpt}
        </blockquote>
      ) : null}
    </Card>
  );
}
