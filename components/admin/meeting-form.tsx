import { createAndProcessMeetingAction } from "@/app/actions/meetings";
import { ErrorBanner } from "@/components/error-banner";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ErrorCodes } from "@/lib/errors";

const EXAMPLE_TRANSCRIPT = `00:00 Laura: Quick check-in, then we should talk through the treatment gap on the new file.
00:31 Ryan: The client stopped treating for about four months after the initial visits.
01:42 Laura: That's going to be a causation argument. We need to document why they paused and whether they had a good explanation.
03:10 Ryan: Let's also look at whether this is a case we keep if the medical picture stays thin.`;

export function MeetingForm({ error }: { error?: string | null }) {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={createAndProcessMeetingAction} className="space-y-6">
      <ErrorBanner
        code={error}
        message={
          error === ErrorCodes.VALIDATION
            ? "Title, meeting date, and transcript are required."
            : undefined
        }
      />

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">What kind of meeting is this?</legend>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-white p-4">
          <input
            type="radio"
            name="kind"
            value="KNOWLEDGE"
            defaultChecked
            className="mt-1"
          />
          <span>
            <span className="block text-sm font-medium">Practice knowledge</span>
            <span className="mt-1 block text-xs leading-5 text-muted-foreground">
              Extract lasting legal and practice topics. Review those before they publish.
            </span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-white p-4">
          <input type="radio" name="kind" value="BIG_CASES" className="mt-1" />
          <span>
            <span className="block text-sm font-medium">Big Cases monthly review</span>
            <span className="mt-1 block text-xs leading-5 text-muted-foreground">
              Keep this as one overall note: each attorney, their top cases, and the next steps to
              move them. Do not split into separate topics.
            </span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-white p-4">
          <input type="radio" name="kind" value="NEW_CASES" className="mt-1" />
          <span>
            <span className="block text-sm font-medium">New Cases Review</span>
            <span className="mt-1 block text-xs leading-5 text-muted-foreground">
              Keep this as one overall note: each attorney, their new or incoming cases, and the
              next steps to get those files moving. Do not split into separate topics.
            </span>
          </span>
        </label>
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="title">Meeting title</Label>
          <Input id="title" name="title" required placeholder="Attorney Meeting" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="meetingDate">Meeting date</Label>
          <Input id="meetingDate" name="meetingDate" type="date" required defaultValue={today} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="videoUrl">YouTube URL (optional)</Label>
        <Input
          id="videoUrl"
          name="videoUrl"
          placeholder="https://www.youtube.com/watch?v=..."
        />
        <p className="text-xs leading-5 text-muted-foreground">
          Leave this blank if the meeting only has a transcript. Unlisted YouTube videos can still be
          watched by anyone who has the link.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="participants">Participants (optional)</Label>
        <Input id="participants" name="participants" placeholder="Laura James, Ryan, Jesús" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="transcript">Transcript</Label>
        <Textarea
          id="transcript"
          name="transcript"
          required
          className="min-h-80 font-mono text-[13px] leading-6"
          placeholder={EXAMPLE_TRANSCRIPT}
        />
        <p className="text-xs leading-5 text-muted-foreground">
          Paste the transcript. Timestamps like 00:31 or 01:12:42 help locate a discussion even when
          there is no video. Practice-knowledge meetings extract lasting topics. Big Cases and New
          Cases Review meetings become one overall note.
        </p>
      </div>

      <SubmitButton pendingLabel="Processing meeting…" size="lg">
        Process Meeting
      </SubmitButton>
      <p className="text-xs text-muted-foreground">
        The transcript is saved first. If OpenAI fails, you can retry without pasting it again.
        Processing usually takes 15–60 seconds.
      </p>
    </form>
  );
}
