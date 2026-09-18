import Link from "next/link";
import { notFound } from "next/navigation";
import { ErrorBanner } from "@/components/error-banner";
import { RetryProcessButton } from "@/components/admin/retry-process-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getMeetingForReview } from "@/lib/db/meetings";
import { formatDate } from "@/lib/utils";
import { MeetingStatus } from "@/lib/generated/prisma/client";

export const maxDuration = 180;
export const dynamic = "force-dynamic";

export default async function MeetingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const error = typeof query.error === "string" ? query.error : null;
  const meeting = await getMeetingForReview(id);
  if (!meeting) notFound();

  const canRetry =
    meeting.status === MeetingStatus.FAILED ||
    meeting.status === MeetingStatus.DRAFT ||
    meeting.candidates.filter((item) => item.status === "PENDING").length === 0;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground">
        ← Admin
      </Link>
      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{meeting.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{formatDate(meeting.meetingDate)}</p>
        </div>
        <Badge className="bg-white">{meeting.status.replaceAll("_", " ")}</Badge>
      </div>

      <div className="mt-6">
        <ErrorBanner code={error} message={meeting.status === MeetingStatus.FAILED ? meeting.processingError : null} />
      </div>

      <Card className="mt-6 space-y-3 p-6 text-sm">
        <p>
          <span className="text-muted-foreground">Recording:</span>{" "}
          {meeting.videoUrl ? (
            <a className="text-accent hover:underline" href={meeting.videoUrl} target="_blank" rel="noreferrer">
              {meeting.videoUrl}
            </a>
          ) : (
            "Transcript only — no video was attached."
          )}
        </p>
        <p>
          <span className="text-muted-foreground">Participants:</span>{" "}
          {meeting.participants.length ? meeting.participants.join(", ") : "Not provided"}
        </p>
        <p>
          <span className="text-muted-foreground">Extracted topics:</span> {meeting.candidates.length}
        </p>
        {meeting.videoUrl ? (
          <p className="text-xs leading-5 text-muted-foreground">
            Unlisted YouTube videos can still be viewed by anyone who possesses the link.
          </p>
        ) : null}
      </Card>

      <div className="mt-6 flex flex-wrap gap-3">
        {meeting.candidates.length > 0 ? (
          <Button asChild>
            <Link href={`/admin/meetings/${meeting.id}/review`}>Open review</Link>
          </Button>
        ) : null}
        {canRetry ? <RetryProcessButton meetingId={meeting.id} /> : null}
      </div>
    </main>
  );
}
