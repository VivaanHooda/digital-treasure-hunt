# Security

This document records the audit of the original client-side Firebase app and how
the server-authoritative rewrite resolves each finding, plus the operational
follow-ups that must be done outside the code.

## Audit findings → resolution

### Critical
- **C1 — Live secrets committed to git history (`.env`).** The original `.env`
  (admin password, reset/switcher passwords, Firebase config) is recoverable from
  early commits. → Rewrite no longer uses any of them; **rotate/decommission the
  old secrets** (see Operational follow-ups) and optionally scrub history.
- **C2 — "Passwords" shipped in the client bundle.** `VITE_`-prefixed values were
  inlined into the JS. → No secrets are exposed to the browser; nothing is
  `NEXT_PUBLIC_`. Verified: the built client bundle contains no DB URL, auth
  secret, or admin password.
- **C3 — No Firestore rules / open DB.** Clients wrote directly to the database.
  → **Clients have zero DB access.** Only the Next.js server (Prisma) reads/writes;
  every endpoint authenticates, authorizes, validates, and rate-limits.
- **C4 — Client-trusted verification + answer coordinates in the bundle.** →
  Verification is server-side in a transaction; the server holds the coordinates
  and never serializes them. Score/progress can only change via the server. GPS
  accuracy is gated and every attempt is recorded in a `Submission` audit row.
- **C5 — Admin panel bypassable via `sessionStorage`.** → Admin is a real DB role
  (`Role.ADMIN`) enforced server-side on every `/api/admin/*` route; the route is
  also gated in middleware. No client-side password.

### High
- **H1 — Pause didn't pause; clock kept draining.** → `verify`/`skip` reject while
  `isPaused`; `computeTime` freezes the countdown during an in-progress pause
  (unit-tested).
- **H2 — Mass PII exposure via leaderboard.** → `/api/leaderboard` returns only
  team name, score, completion count, and completion time. Emails/phones/members
  are admin-only.
- **H3 — Skips counted as completions.** → Completions and skips are separate
  tables; counts and picture/riddle stats derive from completions only.
- **H4 — Non-atomic score writes (race/clobber).** → All mutations are Prisma
  transactions, guarded by a per-user Redis lock and DB unique constraints.
- **H5 — Dataset switch corrupted in-progress games.** → `datasetId` and the
  challenge order are frozen on `GameState` at registration; admin switches affect
  only new games.

### Medium / Low
- **M1** duplicated verify logic → single server path. **M2** leaderboard dropped
  teams with null completion time → explicit `NULLS LAST` ordering. **M3** debug
  `test` collection write → gone. **M4** hardcoded admin email → DB role. **M5**
  plaintext reset password field → removed (RBAC only). **L1** unguarded analytics
  → Firebase removed entirely. **L2** auth error enumeration → generic
  login/registration errors.

## Defense-in-depth controls in the rewrite

- Rate limiting on every endpoint (Redis; strict on login/register).
- Zod validation on all request bodies/params.
- bcrypt password hashing; httpOnly + SameSite JWT cookies; CSRF via Auth.js plus
  an Origin check on mutating routes.
- Single-device login + instant revocation via a Redis session id.
- Security headers incl. CSP, HSTS, X-Frame-Options, X-Content-Type-Options,
  Referrer-Policy, Permissions-Policy (`next.config.mjs`).
- Audit logging of admin actions; per-submission audit trail.

## Operational follow-ups (do outside the code)

1. **Rotate / decommission the leaked secrets.** The old Firebase project
   (`siptreasurehunt`) and the leaked admin/reset passwords are no longer used —
   delete the Firebase project (or rotate its keys) and ensure the new
   `ADMIN_PASSWORD` in `.env` is strong and not reused.
2. **(Optional) Scrub `.env` from git history.** The values are defunct once (1)
   is done, but to remove them from history:
   ```bash
   # using git-filter-repo (recommended)
   pip install git-filter-repo
   git filter-repo --path .env --invert-paths
   # then force-push (coordinate with collaborators) and have everyone re-clone
   git push --force --all && git push --force --tags
   ```
   Note: this rewrites history and requires a force-push. Do the legacy tag first.
3. **npm audit:** the only flagged advisories are in the **dev** toolchain
   (vite/esbuild/vitest dev server) and are not in the production bundle. Keep
   them updated but they don't affect the deployed app.

## Verification performed

- Build-output scan: no secrets or challenge coordinates in `.next/static`.
- Live flow (Postgres + Redis up): register → login → state (no coords) →
  verify wrong (cooldown) → verify during cooldown (429) → verify correct (+pts)
  → skip (separate from completions) → leaderboard (no PII) → admin RBAC (403 for
  users, 401 unauthenticated) → pause blocks play → SSE pushes live updates →
  cross-origin POST blocked → security headers present.
- `npm test`: pause-freeze, Haversine, and challenge-order permutation unit tests.
