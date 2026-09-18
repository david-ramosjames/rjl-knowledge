function encodeAuthPart(value) {
  try {
    return encodeURIComponent(decodeURIComponent(value));
  } catch {
    return encodeURIComponent(value);
  }
}

function withDefaultPort(hostAndPath) {
  const queryIndex = hostAndPath.search(/[/?]/);
  const hostPort = queryIndex === -1 ? hostAndPath : hostAndPath.slice(0, queryIndex);
  const rest = queryIndex === -1 ? "" : hostAndPath.slice(queryIndex);

  if (!hostPort.includes(":")) {
    return `${hostPort}:5432${rest}`;
  }

  const port = hostPort.split(":").pop() || "";
  if (!/^\d+$/.test(port)) {
    throw new Error(
      `DATABASE_URL has an invalid port (${port}). If the database password contains @ : / # or %, URL-encode it, or add DATABASE_URL with Railway’s variable-reference picker instead of pasting a template.`,
    );
  }

  return hostAndPath;
}

function normalizeDatabaseUrl(raw) {
  let value = String(raw).trim().replace(/^['"]+|['"]+$/g, "");

  if (/\$\{\{/.test(value) || value.includes("Postgres.DATABASE_URL")) {
    throw new Error(
      "DATABASE_URL was not expanded. In Railway, add DATABASE_URL with the shared-variable picker pointing at the Postgres service. Do not type ${{Postgres.DATABASE_URL}} as plain text.",
    );
  }

  value = value.replace(/^postgres:\/\//i, "postgresql://");
  if (!/^postgresql:\/\//i.test(value)) {
    throw new Error(
      "DATABASE_URL must start with postgresql://. Copy it from the Postgres service Variables tab.",
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

function redactDatabaseUrl(url) {
  return url.replace(/:([^:@/]+)@/, ":***@");
}

let url =
  process.env.DATABASE_URL?.trim() ||
  process.env.DATABASE_PRIVATE_URL?.trim() ||
  process.env.POSTGRES_URL?.trim();

if (!url) {
  console.error("DATABASE_URL is not set on this service.");
  console.error(
    "In Railway: App service → Variables → New Variable → add a reference to Postgres DATABASE_URL, then redeploy.",
  );
  process.exit(1);
}

try {
  url = normalizeDatabaseUrl(url);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Invalid DATABASE_URL");
  process.exit(1);
}

if (process.env.RAILWAY_ENVIRONMENT && /localhost|127\.0\.0\.1/.test(url)) {
  console.error(
    "DATABASE_URL points at localhost. The web service is not using the Railway Postgres connection string.",
  );
  process.exit(1);
}

process.env.DATABASE_URL = url;
console.info("Connecting to", redactDatabaseUrl(url));

const { spawnSync } = require("node:child_process");

const migrate = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

if (migrate.status !== 0) {
  process.exit(migrate.status ?? 1);
}

const start = spawnSync("npm", ["run", "start"], {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

process.exit(start.status ?? 1);
