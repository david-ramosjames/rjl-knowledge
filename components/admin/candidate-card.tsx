"use client";

import { useState } from "react";
import {
  addToExistingTopicAction,
  approveNewTopicAction,
  editCandidateAction,
  ignoreCandidateAction,
} from "@/app/actions/topics";
import { SubmitButton } from "@/components/submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DEFAULT_CATEGORIES } from "@/lib/categories";
import { asStringArray } from "@/lib/utils";
import { formatTimestamp } from "@/lib/youtube";

type SuggestedTopic = {
  id: string;
  title: string;
  slug: string;
  category: string;
};

type Candidate = {
  id: string;
  title: string;
  category: string;
  summary: string;
  keyPoints: unknown;
  keywords: unknown;
  speakers: unknown;
  startSeconds: number;
  endSeconds: number | null;
  transcriptExcerpt: string;
  status: "PENDING" | "APPROVED" | "IGNORED";
  suggestedTopic: SuggestedTopic | null;
  approvedTopic: { id: string; title: string; slug: string } | null;
};

export function CandidateCard({ candidate, meetingId }: { candidate: Candidate; meetingId: string }) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const keyPoints = asStringArray(candidate.keyPoints);
  const keywords = asStringArray(candidate.keywords);
  const speakers = asStringArray(candidate.speakers);
  const disabled = candidate.status !== "PENDING";

  async function runAction(action: (formData: FormData) => Promise<{ ok: boolean; error?: string }>, formData: FormData) {
    setError(null);
    const result = await action(formData);
    if (!result.ok) setError(result.error ?? "Something went wrong.");
    if (result.ok) setEditing(false);
  }

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold tracking-tight">{candidate.title}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge className="bg-white">{candidate.category}</Badge>
            {candidate.startSeconds > 0 || candidate.endSeconds ? (
              <span>
                {formatTimestamp(candidate.startSeconds)}
                {candidate.endSeconds ? ` – ${formatTimestamp(candidate.endSeconds)}` : ""}
              </span>
            ) : null}
            {speakers.length > 0 ? <span>{speakers.join(", ")}</span> : null}
          </div>
        </div>
        <StatusPill status={candidate.status} />
      </div>

      {candidate.suggestedTopic && candidate.status === "PENDING" ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
          <div className="font-medium text-amber-950">Possible existing topic</div>
          <p className="mt-1 text-amber-900">
            New discussion: “{candidate.title}” may belong with “{candidate.suggestedTopic.title}”.
          </p>
        </div>
      ) : null}

      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}

      {editing ? (
        <form
          className="mt-5 space-y-4"
          action={(formData) => runAction(editCandidateAction, formData)}
        >
          <input type="hidden" name="candidateId" value={candidate.id} />
          <input type="hidden" name="meetingId" value={meetingId} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id={`title-${candidate.id}`}
              label="Title"
              name="title"
              defaultValue={candidate.title}
            />
            <div className="space-y-2">
              <Label htmlFor={`category-${candidate.id}`}>Category</Label>
              <Input
                id={`category-${candidate.id}`}
                name="category"
                list="rjl-categories"
                defaultValue={candidate.category}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Start timestamp"
              name="startTimestamp"
              defaultValue={formatTimestamp(candidate.startSeconds)}
            />
            <Field
              label="End timestamp"
              name="endTimestamp"
              defaultValue={candidate.endSeconds != null ? formatTimestamp(candidate.endSeconds) : ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`summary-${candidate.id}`}>Summary</Label>
            <Textarea id={`summary-${candidate.id}`} name="summary" defaultValue={candidate.summary} rows={4} />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`keyPoints-${candidate.id}`}>Key points (one per line)</Label>
            <Textarea id={`keyPoints-${candidate.id}`} name="keyPoints" defaultValue={keyPoints.join("\n")} rows={5} />
          </div>
          <Field label="Keywords" name="keywords" defaultValue={keywords.join(", ")} />
          <Field label="Speakers" name="speakers" defaultValue={speakers.join(", ")} />
          <div className="space-y-2">
            <Label htmlFor={`excerpt-${candidate.id}`}>Transcript excerpt</Label>
            <Textarea
              id={`excerpt-${candidate.id}`}
              name="transcriptExcerpt"
              defaultValue={candidate.transcriptExcerpt}
              rows={4}
            />
          </div>
          <div className="flex gap-2">
            <SubmitButton pendingLabel="Saving…">Save edits</SubmitButton>
            <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div className="mt-5 space-y-4">
          <p className="text-sm leading-7">{candidate.summary}</p>
          {keyPoints.length > 0 ? (
            <ul className="list-disc space-y-1 pl-5 text-sm leading-6">
              {keyPoints.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          ) : null}
        </div>
      )}

      {!disabled && !editing ? (
        <div className="mt-6 flex flex-wrap gap-2">
          {candidate.suggestedTopic ? (
            <form action={(formData) => runAction(addToExistingTopicAction, formData)}>
              <input type="hidden" name="candidateId" value={candidate.id} />
              <input type="hidden" name="meetingId" value={meetingId} />
              <input type="hidden" name="topicId" value={candidate.suggestedTopic.id} />
              <SubmitButton pendingLabel="Attaching…">Add to Existing Topic</SubmitButton>
            </form>
          ) : (
            <form action={(formData) => runAction(approveNewTopicAction, formData)}>
              <input type="hidden" name="candidateId" value={candidate.id} />
              <input type="hidden" name="meetingId" value={meetingId} />
              <SubmitButton pendingLabel="Approving…">Approve</SubmitButton>
            </form>
          )}
          {candidate.suggestedTopic ? (
            <form action={(formData) => runAction(approveNewTopicAction, formData)}>
              <input type="hidden" name="candidateId" value={candidate.id} />
              <input type="hidden" name="meetingId" value={meetingId} />
              <SubmitButton pendingLabel="Creating…" variant="outline">
                Create New Topic
              </SubmitButton>
            </form>
          ) : null}
          <Button type="button" variant="outline" onClick={() => setEditing(true)}>
            Edit
          </Button>
          <form action={(formData) => runAction(ignoreCandidateAction, formData)}>
            <input type="hidden" name="candidateId" value={candidate.id} />
            <input type="hidden" name="meetingId" value={meetingId} />
            <SubmitButton pendingLabel="Ignoring…" variant="ghost">
              Ignore
            </SubmitButton>
          </form>
        </div>
      ) : null}

      {candidate.approvedTopic ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Published as{" "}
          <a className="text-accent underline-offset-4 hover:underline" href={`/topics/${candidate.approvedTopic.slug}`}>
            {candidate.approvedTopic.title}
          </a>
        </p>
      ) : null}

      <datalist id="rjl-categories">
        {DEFAULT_CATEGORIES.map((category) => (
          <option key={category} value={category} />
        ))}
      </datalist>
    </Card>
  );
}

function Field({
  id,
  label,
  name,
  defaultValue,
}: {
  id?: string;
  label: string;
  name: string;
  defaultValue: string;
}) {
  const fieldId = id ?? name;
  return (
    <div className="space-y-2">
      <Label htmlFor={fieldId}>{label}</Label>
      <Input id={fieldId} name={name} defaultValue={defaultValue} />
    </div>
  );
}

function StatusPill({ status }: { status: Candidate["status"] }) {
  if (status === "APPROVED") return <Badge className="border-green-200 bg-green-50 text-green-800">Approved</Badge>;
  if (status === "IGNORED") return <Badge>Ignored</Badge>;
  return <Badge className="border-blue-200 bg-blue-50 text-blue-800">Needs review</Badge>;
}
