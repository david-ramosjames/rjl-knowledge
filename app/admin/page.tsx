import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getAdminStats } from "@/lib/db/meetings";
import { formatCompactDate } from "@/lib/utils";
import { MeetingStatus } from "@/lib/generated/prisma/client";

export const dynamic = "force-dynamic";

function statusLabel(status: MeetingStatus) {
  switch (status) {
    case MeetingStatus.AWAITING_REVIEW:
      return "Needs review";
    case MeetingStatus.PROCESSED:
      return "Processed";
    case MeetingStatus.FAILED:
      return "Failed";
    case MeetingStatus.PROCESSING:
      return "Processing";
    default:
      return "Draft";
  }
}

export default async function AdminPage() {
  const stats = await getAdminStats();

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">Admin</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Meeting processing</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Paste a transcript — with or without a video — then review lasting topics before they go
            into the Knowledge Hub.
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/admin/meetings/new">
            <Plus className="size-4" />
            Add Meeting
          </Link>
        </Button>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Stat label="Meetings processed" value={stats.meetingsProcessed} />
        <Stat label="Topics created" value={stats.topicsCreated} />
        <Stat label="Topics awaiting review" value={stats.topicsAwaitingReview} />
      </div>

      <section className="mt-12">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Recent meetings
          </h2>
          <Link href="/admin/meetings" className="text-sm text-accent hover:underline">
            View all
          </Link>
        </div>
        <Card className="overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Meeting</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Topics</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentMeetings.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-muted-foreground">
                    No meetings yet. Add one to get started.
                  </td>
                </tr>
              ) : (
                stats.recentMeetings.map((meeting) => (
                  <tr key={meeting.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <Link href={`/admin/meetings/${meeting.id}`} className="font-medium hover:underline">
                        {meeting.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatCompactDate(meeting.meetingDate)}</td>
                    <td className="px-4 py-3">{statusLabel(meeting.status)}</td>
                    <td className="px-4 py-3">
                      {meeting.status === MeetingStatus.AWAITING_REVIEW || meeting.status === MeetingStatus.PROCESSED ? (
                        <Link href={`/admin/meetings/${meeting.id}/review`} className="text-accent hover:underline">
                          Review
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">{meeting._count.candidates}</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-5">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-2 text-3xl font-semibold tracking-tight">{value}</div>
    </Card>
  );
}
