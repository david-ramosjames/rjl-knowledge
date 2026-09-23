import { parseTimestampToSeconds } from "@/lib/youtube";

export type TranscriptLine = {
  startSeconds: number;
  speaker: string | null;
  text: string;
  raw: string;
};

const TIMESTAMP_RE =
  /(?:\[|\()?((?:\d{1,2}:)?\d{1,2}:\d{2})(?:\]|\))?(?:\s*[-–—]\s*)?/;

export function parseTranscript(transcript: string): TranscriptLine[] {
  const lines = transcript
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const parsed: TranscriptLine[] = [];

  for (const line of lines) {
    const match = line.match(TIMESTAMP_RE);
    if (!match || match.index === undefined) continue;

    const startSeconds = parseTimestampToSeconds(match[1]);
    if (startSeconds === null) continue;

    const remainder = line.slice(match.index + match[0].length).trim();
    const speakerMatch = remainder.match(/^([^:]{1,80}):\s*(.*)$/);

    parsed.push({
      startSeconds,
      speaker: speakerMatch ? speakerMatch[1].trim() : null,
      text: speakerMatch ? speakerMatch[2].trim() : remainder,
      raw: line,
    });
  }

  return parsed;
}

export function linesForRange(
  lines: TranscriptLine[],
  startSeconds: number,
  endSeconds?: number | null,
) {
  if (lines.length === 0) return [];
  const end = endSeconds && endSeconds > startSeconds ? endSeconds : startSeconds + 300;
  const inRange = lines.filter((line) => line.startSeconds >= startSeconds - 5 && line.startSeconds <= end);
  return inRange.length > 0 ? inRange : lines;
}

export function excerptForRange(
  lines: TranscriptLine[],
  startSeconds: number,
  endSeconds?: number | null,
  maxChars = 900,
): string {
  const end = endSeconds ?? startSeconds + 180;
  const inRange = lines.filter((line) => line.startSeconds >= startSeconds - 5 && line.startSeconds <= end);

  const source = inRange.length > 0 ? inRange : lines.slice(0, 8);
  const joined = source
    .map((line) => {
      const speaker = line.speaker ? `${line.speaker}: ` : "";
      return `${speaker}${line.text}`.trim();
    })
    .filter(Boolean)
    .join(" ");

  if (joined.length <= maxChars) return joined;
  return `${joined.slice(0, maxChars).trim()}…`;
}

export function speakersFromLines(lines: TranscriptLine[]): string[] {
  const names = new Set<string>();
  for (const line of lines) {
    if (line.speaker) names.add(line.speaker);
  }
  return [...names];
}
