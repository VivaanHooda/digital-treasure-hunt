# Digital Treasure Hunt

A campus location-based treasure hunt. Teams solve picture/riddle challenges by
physically visiting locations; the server verifies their GPS position, scores
them, and ranks them on a live leaderboard.

This is a **server-authoritative rewrite** (Next.js + Prisma/PostgreSQL + Redis)
of an earlier client-side Firebase app. All game logic, scoring, and
authorization run on the server; the browser never touches the database and
never receives the answer coordinates. See [SECURITY.md](./SECURITY.md) for the
audit that motivated the rewrite and how each issue was resolved.

> The original Firebase version is preserved at the git tag
> **`v1.0-firebase-legacy`**.

## Stack

- **Next.js (App Router, TypeScript)** — UI + API route handlers
- **PostgreSQL + Prisma** — data (run locally via Docker)
- **Redis** — rate limiting, single-device sessions, and SSE pub/sub
- **Auth.js (NextAuth) Credentials** — bcrypt + JWT cookies
- **Server-Sent Events + Redis Pub/Sub** — live leaderboard / settings / notifications
- **TanStack Query** — client data fetching
- **Zod** — input validation; **rate-limiter-flexible** — per-endpoint limits

## Local setup

Prerequisites: Node 20+, Docker.

```bash
# 1. Start Postgres + Redis (Postgres maps to host port 5433 to avoid clashing
#    with a native Postgres on 5432).
docker compose up -d

# 2. Install dependencies
npm install

# 3. Configure env
cp .env.example .env        # then edit AUTH_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
#   AUTH_SECRET: openssl rand -base64 32

# 4. Create schema + seed challenges, settings, and the admin user
npm run db:migrate
npm run db:seed

# 5. Run
npm run dev                 # http://localhost:3000
```

Log in as the admin with the `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env`
(admins land on `/admin`). Register a team at `/register` to play.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js dev / production build / serve |
| `npm run db:migrate` | Apply Prisma migrations (dev) |
| `npm run db:seed` | Seed challenges, settings, admin |
| `npm run db:studio` | Prisma Studio |
| `npm test` | Vitest unit tests |
| `npm run infra:up` / `infra:down` | Start/stop Docker services |

## Architecture notes

- **No client DB access.** The browser calls JSON APIs under `/api/*`; only the
  Next.js server (Prisma) reads/writes the database.
- **Server-side verification.** `POST /api/game/verify` receives `{lat,lng,accuracy}`,
  looks up the server-held target, computes distance, enforces cooldown +
  rate-limit + GPS-accuracy gating, and is the only writer of score/progress
  (in a transaction). Coordinates are never serialized to the client.
- **Per-team challenge order** is a random permutation stored on `GameState` at
  registration, with the dataset frozen so an admin dataset switch never
  corrupts an in-progress game.
- **Skips are tracked separately** from completions, so completion counts and
  picture/riddle stats stay accurate.
- **Real-time** is SSE backed by Redis Pub/Sub: events are "something changed"
  signals; the client refetches authoritative state, and a fresh snapshot is
  sent on every (re)connect so a dropped stream can't desync the UI.
- **Single-device login** is enforced via a Redis-stored session id checked on
  every authenticated request.

## Tests

`npm test` runs unit tests for the security-critical pure logic (pause-aware
time math, Haversine distance, challenge-order permutation). The full HTTP flow
(auth, verify, skip, RBAC, rate limits, pause, SSE) is exercised against a
running server with Postgres + Redis up — see SECURITY.md's verification notes.
