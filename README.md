# RJL Knowledge

Private internal knowledge hub for Ramos James Law.

Attorney meetings are recorded and transcribed, but the useful material is usually trapped in those recordings. RJL Knowledge turns each meeting into **source discussions** and publishes the durable knowledge as **topics**.

**Meetings are sources. Topics are the permanent knowledge objects.**

Over time, later meetings that return to the same subject should attach a new discussion to the existing topic instead of creating a duplicate page.

This is an internal application, not a public marketing site. Treat every transcript as confidential.

## What it does

1. An admin pastes a timestamped transcript and an unlisted YouTube URL.
2. OpenAI extracts substantive, reusable topics from what was actually discussed.
3. The admin reviews, edits, ignores, or merges those topics.
4. Approved topics appear in the knowledge hub.
5. Attorneys and staff can search or browse, open a topic, and jump to the exact timestamp in the original meeting video.

The model is instructed to summarize **only** the transcript. It must not add outside legal knowledge or independent legal advice.

## Local setup

Requirements:

- Node.js 22+
- A PostgreSQL database (local or Railway)
- An OpenAI API key

```bash
npm install
cp .env.example .env
```

Edit `.env` with real values, then:

```bash
npx prisma generate
npx prisma migrate deploy
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Admin:

- [http://localhost:3000/admin](http://localhost:3000/admin)
- Add Meeting: `/admin/meetings/new`

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `OPENAI_API_KEY` | Yes, for processing | Meeting topic extraction and topic synthesis |
| `OPENAI_MODEL` | No | Defaults to `gpt-4o` |
| `GOOGLE_CLIENT_ID` | Yes, for login | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Yes, for login | Google OAuth client secret |
| `AUTH_URL` | Recommended in production | Public app origin, e.g. `https://your-app.up.railway.app` |
| `AUTH_SECRET` | Recommended | Cookie signing secret; falls back to `GOOGLE_CLIENT_SECRET` |
| `GOOGLE_ALLOWED_DOMAIN` | No | Only allow emails at this domain, e.g. `ramosjameslaw.com` |
| `GOOGLE_ALLOWED_EMAILS` | No | Comma-separated allowlist of Google emails |
| `AUTH_PASSWORD` | No | Password login only if Google is not configured |

Do not expose `OPENAI_API_KEY`, `DATABASE_URL`, or `GOOGLE_CLIENT_SECRET` to the browser. They are server-only.

If Google credentials are unset, the app is open. That is convenient for first local setup. Set Google sign-in before sharing a deployed URL.

### Google Cloud setup

1. Create an OAuth client (Web application) in Google Cloud.
2. Add authorized JavaScript origins:
   - `http://localhost:3000`
   - `https://your-railway-domain`
3. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/google/callback`
   - `https://rjl-knowledge-production.up.railway.app/api/auth/google/callback`

The Railway value must include `/api/auth/google/callback`. The site root (`https://rjl-knowledge-production.up.railway.app`) is an origin, not a redirect URI.

Also set `AUTH_URL=https://rjl-knowledge-production.up.railway.app` on the Railway app service so Google always receives an `https` callback. Do not set `AUTH_URL` to `localhost` or `http://localhost:8080` — that is Railway’s internal listen address, not the public site. Google blocks `http://` redirect URIs in production with “Access blocked: Authorization Error / invalid_request”.
4. Put `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env` and in the Railway app service variables.

## Prisma

Generate the client:

```bash
npm run db:generate
```

Apply migrations to an existing database:

```bash
npm run db:migrate
```

Create a new migration during development:

```bash
npm run db:migrate:dev
```

Push the schema without migration history (local experiments only):

```bash
npm run db:push
```

## Seed command

```bash
npm run db:seed
```

This loads clearly labeled **DEMO PLACEHOLDER** topics and two fake meetings, including:

- Gaps in Medical Treatment
- Airbnb Premises Liability Cases
- Evaluating Low Property Damage Cases
- When to Disengage a Client
- UM/UIM Coverage Issues
- Commercial Trucking Case Evaluation

“Gaps in Medical Treatment” is attached to both demo meetings so you can see one topic with multiple source discussions.

The seed video is a public placeholder (`Big Buck Bunny`) so timestamp links work. It is not an RJL recording.

## npm scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the Next.js dev server |
| `npm run build` | Generate Prisma Client and build the app |
| `npm start` | Start the production server |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |
| `npm run db:generate` | `prisma generate` |
| `npm run db:migrate` | `prisma migrate deploy` |
| `npm run db:migrate:dev` | `prisma migrate dev` |
| `npm run db:seed` | Seed demo data |
| `npm run db:studio` | Open Prisma Studio |

`postinstall` also runs `prisma generate`.

## Railway Postgres

You need **two services** in the same Railway project:

1. PostgreSQL
2. This Next.js app

Postgres gets `DATABASE_URL` automatically. The **app service does not**. Share it, or the app cannot reach the database.

### Connecting DATABASE_URL to the app service

In Railway:

1. Open the **app** service (not the Postgres service).
2. Go to **Variables**.
3. Add a variable reference:

```text
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

Use Railway’s variable picker if the Postgres service is not named `Postgres`. It will insert the correct reference.

Do **not** paste a `localhost` URL. The app container cannot reach Postgres on localhost.

`DATABASE_PRIVATE_URL` is also accepted if you prefer Railway’s private network URL.

Then redeploy the app service. Migrations run on boot via:

```text
npm run start:migrate
```

To load demo content after the first successful deploy:

```bash
railway run npm run db:seed
```

or use Railway’s one-off command / shell against the app service.

### `Can't reach database server at localhost:5432`

The app service is missing the Railway Postgres URL. Add the `DATABASE_URL` reference above, then redeploy.

### `invalid port number in database URL` (P1013)

Prisma received a `DATABASE_URL` it could not parse. The usual causes:

1. `DATABASE_URL` was typed as `${{Postgres.DATABASE_URL}}` instead of added with Railway’s **variable reference** picker.
2. The Postgres password contains `@`, `:`, `/`, `#`, or `%` and was not URL-encoded.
3. The app `DATABASE_URL` is not the Postgres connection string (for example the Railway website URL).

Fix: delete the app service `DATABASE_URL`, add it again with **Add a variable reference** → Postgres → `DATABASE_URL`, then redeploy. The value should look like `postgresql://postgres:...@...:PORT/railway`.

## Adding OPENAI_API_KEY

In the Next.js service variables:

```text
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
AUTH_URL=https://your-app.up.railway.app
AUTH_SECRET=another-long-random-string
GOOGLE_ALLOWED_DOMAIN=ramosjameslaw.com
```

## Deploying the Next.js app to Railway

1. Push this repository to GitHub (or deploy from the local directory with the Railway CLI).
2. In Railway, **New Service → GitHub Repo** (or `railway up`).
3. Attach / share the Postgres `DATABASE_URL` variable with the **app** service using a Railway variable reference. Do not leave it only on the Postgres service.
4. Add `OPENAI_API_KEY`.
5. Add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `AUTH_URL`.
6. Deploy. Nixpacks is configured to use Node 22.
7. Open the public URL, visit `/admin`, and process a meeting.

If build fails on `prisma generate`, confirm `postinstall` ran and that Node 22 is in use.

### Railway CLI sketch

```bash
npm i -g @railway/cli
railway login
railway init
railway add --database postgres
railway variable set OPENAI_API_KEY=sk-...
railway variable set GOOGLE_CLIENT_ID=...
railway variable set GOOGLE_CLIENT_SECRET=...
railway up
railway run npm run db:seed
```

Link `DATABASE_URL` from the Postgres service to the app service in the Railway dashboard if it is not injected automatically.

## Using the product

1. Open `/admin`.
2. Click **Add Meeting**.
3. Paste a timestamped transcript (`00:31 Speaker:` or `01:12:42` both work).
4. Paste an unlisted YouTube URL.
5. Click **Process Meeting**.
6. Review each extracted topic: **Approve**, **Edit**, or **Ignore**.
7. If a possible existing topic is shown, choose **Add to Existing Topic** or **Create New Topic**.
8. Approved topics appear on the homepage and in search.
9. On a topic page, **Watch discussion at mm:ss** opens the original video at that timestamp.

If OpenAI fails, the meeting and transcript are still saved. Open the meeting and click **Retry processing**.

## Architecture

```text
/app            Hub, search, topic pages, admin, server actions
/components     UI
/lib/db         Prisma client and topic/meeting writes
/lib/ai         OpenAI extraction and synthesis
/lib/search     Postgres full-text / ILIKE search
/lib/youtube    URL parsing and timestamped watch links
/prisma         Schema, migrations, seed
```

Search is isolated in `lib/search` so semantic / pgvector search can be added later without rewriting the UI.

## Privacy notes

- Transcripts and meeting content are private internal data.
- Production logs redact transcripts and secrets.
- Unlisted YouTube videos are **not** private. Anyone with the link can watch them.
- Do not paste OpenAI keys or database credentials into client code. This app keeps them on the server.

## License

Private internal software for Ramos James Law.
