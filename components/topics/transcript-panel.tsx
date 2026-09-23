"use client";

import { useState } from "react";
import { namedSpeakers } from "@/lib/utils";
import { formatTimestamp } from "@/lib/youtube";
import { stripSpokenTimestamp, type TranscriptLine } from "@/lib/transcript/parse";

export function TranscriptPanel({
  rangeLines,
  fullLines,
  rawTranscript,
}: {
  rangeLines: TranscriptLine[];
  fullLines: TranscriptLine[];
  rawTranscript: string;
}) {
  const [showFull, setShowFull] = useState(false);
  const parsed = showFull ? fullLines : rangeLines;
  const canToggle = fullLines.length > rangeLines.length || (fullLines.length > 0 && rangeLines !== fullLines);
  const raw = rawTranscript.trim();

  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h4 className="text-sm font-semibold tracking-tight">Transcript</h4>
        {canToggle ? (
          <button
            type="button"
            onClick={() => setShowFull((value) => !value)}
            className="text-sm font-medium text-accent hover:underline"
          >
            {showFull ? "Show this topic only" : "Show full meeting transcript"}
          </button>
        ) : null}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Read the conversation here, or use the video above if you prefer to watch.
      </p>
      {parsed.length > 0 ? (
        <div className="mt-4 max-h-128 space-y-3 overflow-y-auto rounded-xl border border-border bg-muted/30 px-4 py-4">
          {parsed.map((line, index) => {
            const speaker = line.speaker ? namedSpeakers([line.speaker])[0] : null;
            return (
              <div key={`${line.startSeconds}-${index}`} className="grid grid-cols-[4.5rem_1fr] gap-3 text-sm">
                <div className="font-mono text-xs text-muted-foreground">{formatTimestamp(line.startSeconds)}</div>
                <p className="leading-6">
                  {speaker ? <span className="font-medium">{speaker}: </span> : null}
                  {line.text}
                </p>
              </div>
            );
          })}
        </div>
      ) : raw ? (
        <pre className="mt-4 max-h-128 overflow-y-auto whitespace-pre-wrap rounded-xl border border-border bg-muted/30 px-4 py-4 text-sm leading-7">
          {raw
            .split(/\r?\n/)
            .map((line) => stripSpokenTimestamp(line))
            .filter(Boolean)
            .join("\n")}
        </pre>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">No transcript is available for this source.</p>
      )}
    </div>
  );
}
