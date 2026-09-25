import Link from "next/link";
import { Card } from "@/components/ui/card";
import { listMeetings } from "@/lib/db/meetings";
import { isReviewMeetingKind, meetingKindLabel } from "@/lib/meetings/kinds";
import { formatCompactDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MeetingsListPage() {
  const meetings = await listMeetings();

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Meetings</h1>
      <Card className="mt-6 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Kind</th>
              <th className="px-4 py-3 font-medium">Topics</th>
            </tr>
          </thead>
          <tbody>
            {meetings.map((meeting) => (
              <tr key={meeting.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">
                  <Link href={`/admin/meetings/${meeting.id}`} className="font-medium hover:underline">
                    {meeting.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{formatCompactDate(meeting.meetingDate)}</td>
                <td className="px-4 py-3">{meeting.status.replaceAll("_", " ")}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {meetingKindLabel(meeting.kind)}
                </td>
                <td className="px-4 py-3">
                  {isReviewMeetingKind(meeting.kind)
                    ? meeting.article
                      ? "Note"
                      : "—"
                    : meeting._count.candidates}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </main>
  );
}
