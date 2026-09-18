const url =
  process.env.DATABASE_URL?.trim() ||
  process.env.DATABASE_PRIVATE_URL?.trim() ||
  process.env.POSTGRES_URL?.trim();

if (!url) {
  console.error("DATABASE_URL is not set on this service.");
  console.error(
    "In Railway: App service → Variables → add a reference to your Postgres DATABASE_URL, then redeploy.",
  );
  process.exit(1);
}

if (process.env.RAILWAY_ENVIRONMENT && /localhost|127\.0\.0\.1/.test(url)) {
  console.error(
    "DATABASE_URL points at localhost. The web service is not using the Railway Postgres connection string.",
  );
  process.exit(1);
}

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
