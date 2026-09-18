const SENSITIVE_KEYS = new Set([
  "transcript",
  "transcriptExcerpt",
  "sourceSummary",
  "apiKey",
  "openai",
  "authorization",
  "password",
  "secret",
  "database_url",
  "connectionString",
]);

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).map(([key, nested]) => {
      if (SENSITIVE_KEYS.has(key) || SENSITIVE_KEYS.has(key.toLowerCase())) {
        return [key, "[redacted]"];
      }
      return [key, redact(nested)];
    });
    return Object.fromEntries(entries);
  }
  return value;
}

export function logError(message: string, meta?: Record<string, unknown>) {
  if (meta) {
    console.error(message, redact(meta));
    return;
  }
  console.error(message);
}

export function logInfo(message: string, meta?: Record<string, unknown>) {
  if (meta) {
    console.info(message, redact(meta));
    return;
  }
  console.info(message);
}
