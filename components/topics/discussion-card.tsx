import { Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { asStringArray, formatDate } from "@/lib/utils";
import { formatTimestamp, timestampedYouTubeUrl } from "@/lib/youtube";

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
  youtubeVideoId: string;
  startSeconds: number;
}) {
  const speakerList = asStringArray(speakers);
  const watchUrl = timestampedYouTubeUrl(youtubeVideoId, startSeconds);

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
        <Badge className="bg-white">Source discussion</Badge>
      </div>
      <p className="mt-4 text-sm leading-7 text-foreground/90">{sourceSummary}</p>
      <div className="mt-5">
        <Button asChild>
          <a href={watchUrl} target="_blank" rel="noreferrer">
            <Play className="size-4" />
            Watch discussion at {formatTimestamp(startSeconds)}
          </a>
        </Button>
      </div>
      {transcriptExcerpt ? (
        <blockquote className="mt-5 border-l-2 border-border pl-4 text-sm leading-7 text-muted-foreground">
          {transcriptExcerpt}
        </blockquote>
      ) : null}
    </Card>
  );
}
