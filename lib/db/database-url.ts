const GENERATE_FALLBACK = "postgresql://postgres:postgres@127.0.0.1:5432/postgres";

function encodeAuthPart(value: string) {
  try {
    return encodeURIComponent(decodeURIComponent(value));
  } catch {
    return encodeURIComponent(value);
  }
}

function withDefaultPort(hostAndPath: string) {
  const queryIndex = hostAndPath.search(/[/?]/);
  const hostPort = queryIndex === -1 ? hostAndPath : hostAndPath.slice(0, queryIndex);
  const rest = queryIndex === -1 ? "" : hostAndPath.slice(queryIndex);

  if (hostPort.startsWith("[")) {
    const closing = hostPort.indexOf("]");
    const after = closing === -1 ? "" : hostPort.slice(closing + 1);
    if (!after.startsWith(":")) {
      return `${hostPort}:5432${rest}`;
    }
    const port = after.slice(1);
    if (!/^\d+$/.test(port)) {
      throw new Error(
        `DATABASE_URL has an invalid port (${port}). If the database password contains @ : / # or %, URL-encode it, or use Railway’s variable reference picker instead of pasting the URL.`,
      );
    }
    return hostAndPath;
  }

  if (!hostPort.includes(":")) {
    return `${hostPort}:5432${rest}`;
  }

  const port = hostPort.split(":").pop() ?? "";
  if (!/^\d+$/.test(port)) {
    throw new Error(
      `DATABASE_URL has an invalid port (${port}). This usually means the Postgres password contains special characters, or DATABASE_URL was pasted as \${{Postgres.DATABASE_URL}} instead of added as a Railway variable reference.`,
    );
  }

  return hostAndPath;
}

export function normalizeDatabaseUrl(raw: string) {
  let value = raw.trim().replace(/^['"]+|['"]+$/g, "");

  if (/\$\{\{/.test(value) || value.includes("Postgres.DATABASE_URL")) {
    throw new Error(
      "DATABASE_URL was not expanded. In Railway, open the app service → Variables → add DATABASE_URL with the shared-variable picker pointing at Postgres. Do not type ${{Postgres.DATABASE_URL}} as plain text.",
    );
  }

  value = value.replace(/^postgres:\/\//i, "postgresql://");
  if (!/^postgresql:\/\//i.test(value)) {
    throw new Error(
      "DATABASE_URL must be a Postgres connection string starting with postgresql://. Copy it from the Postgres service, or add it as a Railway variable reference.",
    );
  }

  const rest = value.slice("postgresql://".length);
  const at = rest.lastIndexOf("@");
  if (at === -1) {
    return `postgresql://${withDefaultPort(rest)}`;
  }

  const creds = rest.slice(0, at);
  const hostAndPath = rest.slice(at + 1);
  const colon = creds.indexOf(":");
  const username = colon === -1 ? creds : creds.slice(0, colon);
  const password = colon === -1 ? "" : creds.slice(colon + 1);

  return `postgresql://${encodeAuthPart(username)}:${encodeAuthPart(password)}@${withDefaultPort(hostAndPath)}`;
}

export function getDatabaseUrl(options?: { allowGenerateFallback?: boolean }) {
  const url =
    process.env.DATABASE_URL?.trim() ||
    process.env.DATABASE_PRIVATE_URL?.trim() ||
    process.env.POSTGRES_URL?.trim();

  if (url) return normalizeDatabaseUrl(url);

  if (options?.allowGenerateFallback) {
    return GENERATE_FALLBACK;
  }

  throw new Error(
    "DATABASE_URL is not set. On Railway, open the app service → Variables and add a reference to the Postgres service DATABASE_URL, then redeploy.",
  );
}

export function redactDatabaseUrl(url: string) {
  return url.replace(/:([^:@/]+)@/, ":***@");
}

export function isGenerateCommand(argv = process.argv) {
  return argv.includes("generate");
}
