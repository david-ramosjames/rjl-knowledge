export class AppError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
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
      return "No lasting knowledge topics were found. Action items, weekly status, and other operational chatter were ignored on purpose.";
    case ErrorCodes.DUPLICATE_PROCESSING:
      return "This meeting or video has already been processed.";
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
