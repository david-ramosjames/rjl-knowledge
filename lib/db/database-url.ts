const GENERATE_FALLBACK = "postgresql://postgres:postgres@127.0.0.1:5432/postgres";

export function getDatabaseUrl(options?: { allowGenerateFallback?: boolean }) {
  const url =
    process.env.DATABASE_URL?.trim() ||
    process.env.DATABASE_PRIVATE_URL?.trim() ||
    process.env.POSTGRES_URL?.trim();

  if (url) return url;

  if (options?.allowGenerateFallback) {
    return GENERATE_FALLBACK;
  }

  throw new Error(
    "DATABASE_URL is not set. On Railway, open the app service → Variables and add a reference to the Postgres service DATABASE_URL (for example ${{Postgres.DATABASE_URL}}), then redeploy.",
  );
}

export function isGenerateCommand(argv = process.argv) {
  return argv.includes("generate");
}
