import { MeetingForm } from "@/components/admin/meeting-form";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

export default async function NewMeetingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : null;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">Admin</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Add meeting</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Save the source first, then extract lasting topics. A YouTube URL is optional when there is
        no recording. Nothing publishes until you review it.
      </p>
      <div className="mt-8">
        <MeetingForm error={error} />
      </div>
    </main>
  );
}
