import Link from "next/link";
import { notFound } from "next/navigation";
import { restoreIgnoredCandidatesAction } from "@/app/actions/topics";
import { CandidateCard } from "@/components/admin/candidate-card";
import { RetryProcessButton } from "@/components/admin/retry-process-button";
import { SubmitButton } from "@/components/submit-button";
import { getMeetingForReview } from "@/lib/db/meetings";
import { formatDate } from "@/lib/utils";

export const maxDuration = 180;
export const dynamic = "force-dynamic";

export default async function ReviewMeetingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const meeting = await getMeetingForReview(id);
  if (!meeting) notFound();

  const pending = meeting.candidates.filter((candidate) => candidate.status === "PENDING").length;
  const ignored = meeting.candidates.filter((candidate) => candidate.status === "IGNORED").length;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground">
        ← Admin
      </Link>
      <p className="mt-6 text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
        Review
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        {meeting.candidates.length} topic{meeting.candidates.length === 1 ? "" : "s"} found
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {meeting.title} · {formatDate(meeting.meetingDate)}
        {pending
          ? ` · ${pending} still need review`
          : ignored
            ? ` · ${ignored} ignored — bring back any you still want`
            : " · Review complete"}
      </p>

      {meeting.candidates.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-border px-5 py-8 text-sm text-muted-foreground">
          <p>
            {meeting.processingError ||
              "No knowledge topics were found. If this meeting had legal or practice discussion, retry processing."}
          </p>
          <div className="mt-4">
            <RetryProcessButton meetingId={meeting.id} />
          </div>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {ignored > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-white px-4 py-3 text-sm">
              <p className="text-muted-foreground">
                Deleted or ignored topics stay here. Bring them back to approve them again — Retry
                processing was skipping them.
              </p>
              <form action={restoreIgnoredCandidatesAction}>
                <input type="hidden" name="meetingId" value={meeting.id} />
                <SubmitButton pendingLabel="Restoring…">Bring ignored topics back</SubmitButton>
              </form>
            </div>
          ) : null}
          {meeting.candidates.map((candidate) => (
            <CandidateCard key={candidate.id} candidate={candidate} meetingId={meeting.id} />
          ))}
        </div>
      )}
    </main>
  );
}
