<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# Repository guidance

## Architecture and current phase

Aster is a TanStack Start modular monolith. Keep the React/TanStack Query frontend and server routes in this application; do not create a separate Express service. The Lovable-generated UI and design tokens are the presentation baseline and must be preserved.

Phase 3A added Better Auth under `/api/auth/*`, Drizzle/PostgreSQL-backed authentication and sessions, Redis auth rate limiting, CSRF/trusted-origin checks, and Mailpit development email. The browser still uses the mock `AuthService`; conversation and chat services are also mock-backed.

Frontend code lives in `src/components`, `src/hooks`, and `src/services`. Server-only code belongs under `src/server` and must use `.server.ts` boundaries. Shared Zod contracts belong in `src/contracts`. Drizzle migrations belong in `drizzle` and must be checked in.

## Commands

Use npm only.

- Development: `npm run dev`
- Type-check: `npm run typecheck`
- Lint: `npm run lint`
- Tests: `npm test`
- Production build: `npm run build`
- Generate migration: `npm run db:generate`
- Apply migration: `npm run db:migrate`
- Validate Compose: `docker compose config`

Run type-checking, linting, tests, and the production build after every implementation phase.

## TypeScript and security rules

- Keep TypeScript strict and prefer shared inferred types over duplicated request or domain types.
- Validate all external input at the server boundary with Zod and return controlled errors.
- Gemini API keys, session secrets, database credentials, Redis credentials, email credentials, cookies, and tokens must never enter frontend code or client bundles.
- Authenticated user IDs must come only from verified server sessions; never trust a browser-supplied user ID.
- Preserve server-only environment access through `.server.ts` modules. Never commit real secrets.
- Do not log passwords, reset/verification/session tokens, cookies, authorization headers, or connection strings.
- Preserve generic authentication responses where account enumeration is possible.

## Scope discipline

The next minimal phase is Phase 3B: replace only the mock frontend `AuthService` and connect the existing Lovable auth/session/protected-route flows to the completed Better Auth backend. Do not add conversation/message persistence, Gemini, chat streaming, new infrastructure, optional providers, or unrelated refactors during Phase 3B.
