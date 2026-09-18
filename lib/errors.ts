export class AppError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: { meetingId?: string };

  constructor(code: string, message: string, status = 400, details?: { meetingId?: string }) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function errorCodeOf(error: unknown): string | undefined {
  if (error instanceof AppError) return error.code;
  if (error && typeof error === "object" && "code" in error && typeof error.code === "string") {
    return error.code;
  }
}

export function errorMeetingIdOf(error: unknown): string | undefined {
  if (error instanceof AppError) return error.details?.meetingId;
  if (error && typeof error === "object" && "details" in error) {
    const details = (error as { details?: { meetingId?: unknown } }).details;
    return typeof details?.meetingId === "string" ? details.meetingId : undefined;
  }
}

export const ErrorCodes = {
  MISSING_TRANSCRIPT: "MISSING_TRANSCRIPT",
  INVALID_YOUTUBE_URL: "INVALID_YOUTUBE_URL",
  OPENAI_FAILURE: "OPENAI_FAILURE",
  MALFORMED_LLM_JSON: "MALFORMED_LLM_JSON",
  DATABASE_FAILURE: "DATABASE_FAILURE",
  NO_TOPICS: "NO_TOPICS",
  DUPLICATE_PROCESSING: "DUPLICATE_PROCESSING",
  NOT_FOUND: "NOT_FOUND",
  VALIDATION: "VALIDATION",
} as const;

export function errorMessageFromCode(code: string, fallback?: string): string {
  switch (code) {
    case ErrorCodes.MISSING_TRANSCRIPT:
      return "A transcript is required before a meeting can be processed.";
    case ErrorCodes.INVALID_YOUTUBE_URL:
      return "That does not look like a valid YouTube URL. Paste a full watch or youtu.be link, or leave the video field blank for transcript-only meetings.";
    case ErrorCodes.OPENAI_FAILURE:
      return "The meeting was saved, but OpenAI processing failed. You can retry without losing the transcript.";
    case ErrorCodes.MALFORMED_LLM_JSON:
      return "The model returned an unreadable response. The meeting was saved — retry processing.";
    case ErrorCodes.DATABASE_FAILURE:
      return "A database error occurred. Try again in a moment.";
    case ErrorCodes.NO_TOPICS:
      return "No knowledge topics were found in this transcript.";
    case ErrorCodes.DUPLICATE_PROCESSING:
      return "This meeting is already in the hub. Open it to review topics or retry processing.";
    case ErrorCodes.NOT_FOUND:
      return "We could not find that record.";
    default:
      return fallback || "Something went wrong. Try again.";
  }
}

export function toErrorMessage(error: unknown): string {
  if (error instanceof AppError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong. Try again.";
}
