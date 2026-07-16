# Codex Handoff — Aster

## Current checkpoint

Phase 3A (backend authentication) is complete. Aster remains one TanStack Start modular monolith. The existing Lovable frontend and all mock frontend services are unchanged; real frontend authentication is explicitly deferred to Phase 3B.

## Implemented in Phase 3A

- Better Auth `1.6.23` is mounted through the TanStack Start catch-all route at `/api/auth/*`.
- Better Auth uses the Drizzle PostgreSQL adapter. Users, credentials, verification records, and sessions are database-backed.
- Email/password signup and login, required email verification, logout, current-session lookup, forgot-password, and password reset are configured.
- Password reset tokens expire after one hour, are single-use, and a successful reset revokes existing sessions.
- Auth cookies use the `aster` prefix, `HttpOnly`, `SameSite=Lax`, and `Path=/`; `Secure` is enabled when `NODE_ENV=production`.
- Mutation requests have TanStack same-origin CSRF middleware plus auth-specific exact-origin validation against `BETTER_AUTH_URL` and `TRUSTED_ORIGINS`.
- Existing Zod auth contracts validate and normalize request bodies. Email addresses are trimmed and lowercased before Better Auth receives them.
- Login failures and forgot-password requests return generic responses. Redirect targets accepted by the auth wrapper must be internal paths.
- Better Auth rate limits auth endpoints using Redis. The Redis adapter uses an atomic Lua `consume` operation to prevent concurrent-request bypasses.
- Nodemailer sends verification and reset messages to Mailpit in development. Sensitive tokens, cookies, authorization headers, and passwords are not logged.
- Zod was aligned to version 4 because Better Auth uses Zod 4 APIs.

## Database migration

Checked-in migration: `drizzle/0000_familiar_the_anarchist.sql`, with Drizzle journal and snapshot metadata.

It creates Better Auth's recommended tables:

- `user`
- `session`
- `account`
- `verification`

Foreign keys cascade from `session.user_id` and `account.user_id` to `user.id`. Session tokens and stored email values are unique. A defensive `user_email_lower_unique` functional index enforces case-insensitive email uniqueness.

No conversation or message tables were added.

## Server environment variables

All values are documented with placeholders in `.env.example`.

Required authentication/runtime values:

- `DATABASE_URL`
- `REDIS_URL`
- `REDIS_KEY_PREFIX`
- `SESSION_SECRET` (at least 32 characters; use a random production secret)
- `BETTER_AUTH_URL` (the externally reachable application origin)
- `TRUSTED_ORIGINS` (comma-separated additional exact origins)
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_FROM`

Existing runtime values remain: `NODE_ENV`, `HOST`, `PORT`, `LOG_LEVEL`, `REQUEST_BODY_LIMIT_BYTES`, and `SHUTDOWN_TIMEOUT_MS`. `GEMINI_API_KEY` and `GEMINI_MODEL` remain unused placeholders for a later phase and must never enter frontend code.

## Local setup and testing

1. Copy `.env.example` to `.env` and replace the local PostgreSQL password and `SESSION_SECRET` placeholders.
2. Start dependencies: `docker compose up -d postgres redis mailpit`.
3. Apply the checked-in migration: `npm run db:migrate`.
4. Start Aster: `npm run dev`.
5. Open Aster at the origin configured by `BETTER_AUTH_URL` (the Vite dev default in this repository is `http://localhost:8080`).
6. Open Mailpit at `http://localhost:8025` to follow verification and password-reset links.

To run the whole application in containers, set non-placeholder `POSTGRES_PASSWORD` and `SESSION_SECRET`, run `docker compose up --build`, and apply `npm run db:migrate` against that database before testing signup. Database migrations are not automatically run by the app container.

Checkpoint verification on 2026-07-17:

- `npm run typecheck` — passed
- `npm run lint` — passed
- `npm test` — passed: 8 files, 23 tests
- `npm run build` — passed with the Node/Nitro production target
- `docker compose config --quiet` — passed; this sandbox only warned that the user's Docker CLI config file was unreadable

Tests cover environment validation, existing health/error infrastructure, auth request validation and origin rejection, generic login and forgot-password behavior, email normalization and duplicate signup, email verification, session restoration, logout revocation, invalid/reused reset tokens, reset-triggered session revocation, rate limiting, and Redis rate-limit serialization.

## Explicitly deferred

The exact minimal Phase 3B objective is to replace only the mock browser `AuthService` and connect the existing Lovable auth forms, session state, redirects, logout, and protected-route checks to the completed Better Auth backend:

- Replace only the mock `AuthService` with an HTTP/Better Auth implementation.
- Connect login, signup, logout, forgot-password, and reset-password forms.
- Add password visibility toggles without changing the existing design.
- Restore sessions after refresh and protect authenticated routes with server session checks.
- Redirect authenticated users away from auth pages, validate redirect destinations, show controlled errors, and clear auth-related TanStack Query state on logout.
- Add frontend/session/protected-route tests and a client-bundle secret scan.

Also deferred: conversation/message tables and APIs, Gemini, chat streaming, general rate limiting, and replacing conversation/chat mock services.

Phase 3B must not introduce a separate backend, new infrastructure, optional authentication providers, production email delivery, unrelated refactors, or design changes. Implement only what is necessary to complete frontend authentication integration and its tests.

## Known limitations and next-thread notes

- The browser still uses `mockAuthService`; the new backend endpoints are not yet called by the UI. Current frontend route protection therefore still trusts mock client state.
- Backend tests use Better Auth's isolated memory adapter; no automated live integration test currently starts PostgreSQL, Redis, or Mailpit. Production configuration uses Drizzle/PostgreSQL and Redis.
- Mailpit is development-only. A production email provider and delivery/retry strategy are not configured.
- The migration must be applied manually before auth endpoints can use PostgreSQL.
- `npm install` reports four moderate transitive dependency audit findings; no forced or breaking audit upgrade was applied.
- The production build emits only the pre-existing advisory that Vite now supports TypeScript path resolution natively while this project still uses `vite-tsconfig-paths`.
- Do not redesign or replace the Lovable component tree. Start the next task at Phase 3B frontend auth integration and keep all authenticated user IDs sourced only from verified server sessions.
