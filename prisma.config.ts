import "dotenv/config";
import { defineConfig } from "prisma/config";

const isGenerate = process.argv.includes("generate");
const databaseUrl =
  process.env.DATABASE_URL?.trim() ||
  process.env.DATABASE_PRIVATE_URL?.trim() ||
  process.env.POSTGRES_URL?.trim() ||
  (isGenerate ? "postgresql://postgres:postgres@127.0.0.1:5432/postgres" : undefined);

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is not set. On Railway, open the app service → Variables and add a reference to the Postgres DATABASE_URL (for example ${{Postgres.DATABASE_URL}}), then redeploy.",
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: databaseUrl,
  },
});
