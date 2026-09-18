import "dotenv/config";
import { defineConfig } from "prisma/config";

const isGenerate = process.argv.includes("generate");

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
  if (!hostPort.includes(":")) return `${hostPort}:5432${rest}`;
  const port = hostPort.split(":").pop() ?? "";
  if (!/^\d+$/.test(port)) {
    throw new Error(
      `DATABASE_URL has an invalid port (${port}). Encode special characters in the password, or add DATABASE_URL as a Railway variable reference instead of pasting a template.`,
    );
  }
  return hostAndPath;
}

function normalizeDatabaseUrl(raw: string) {
  let value = raw.trim().replace(/^['"]+|['"]+$/g, "");
  if (/\$\{\{/.test(value) || value.includes("Postgres.DATABASE_URL")) {
    throw new Error(
      "DATABASE_URL was not expanded. Add it with Railway’s variable-reference picker, not as the text ${{Postgres.DATABASE_URL}}.",
    );
  }
  value = value.replace(/^postgres:\/\//i, "postgresql://");
  if (!/^postgresql:\/\//i.test(value)) {
    throw new Error("DATABASE_URL must start with postgresql://.");
  }
  const rest = value.slice("postgresql://".length);
  const at = rest.lastIndexOf("@");
  if (at === -1) return `postgresql://${withDefaultPort(rest)}`;
  const creds = rest.slice(0, at);
  const hostAndPath = rest.slice(at + 1);
  const colon = creds.indexOf(":");
  const username = colon === -1 ? creds : creds.slice(0, colon);
  const password = colon === -1 ? "" : creds.slice(colon + 1);
  return `postgresql://${encodeAuthPart(username)}:${encodeAuthPart(password)}@${withDefaultPort(hostAndPath)}`;
}

const rawUrl =
  process.env.DATABASE_URL?.trim() ||
  process.env.DATABASE_PRIVATE_URL?.trim() ||
  process.env.POSTGRES_URL?.trim() ||
  (isGenerate ? "postgresql://postgres:postgres@127.0.0.1:5432/postgres" : undefined);

if (!rawUrl) {
  throw new Error(
    "DATABASE_URL is not set. On Railway, open the app service → Variables and add a reference to the Postgres DATABASE_URL, then redeploy.",
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: normalizeDatabaseUrl(rawUrl),
  },
});
