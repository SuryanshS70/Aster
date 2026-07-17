# Codex Handoff — Aster

## Current checkpoint

Phase 3B (frontend authentication integration) is complete. Aster remains one TanStack Start
modular monolith. The existing Lovable layout, styling, and component structure are preserved.

The browser now uses the Phase 3A Better Auth backend for authentication and server-backed
sessions. Conversation and chat services intentionally remain mock-backed.

## Implemented in Phase 3B

- Replaced `mockAuthService` with same-origin, credentialed HTTP calls to `/api/auth/*` for login,
  signup, logout, current-session lookup, forgot-password, and password reset.
- Removed the localStorage authentication session, generated mock users, fake authentication
  success, and the fallback reset token.
- Kept the existing `AuthService` interface, with the minimal signup return-type change needed for
  required email verification: signup returns `null` while verification is pending instead of
  inventing a session.
- Restores the authenticated user after refresh from Better Auth's `get-session` endpoint. User IDs
  shown to the frontend come only from that verified server session.
- Protected layouts wait for session verification and redirect unauthenticated users to `/login`.
- Authenticated users are redirected away from `/login` and `/signup` to `/chat`.
- Login redirects accept only the exact internal allowlist `/chat` and `/settings`; invalid,
  external, protocol-relative, and unlisted destinations fall back to `/chat`.
- Logout calls Better Auth, clears all TanStack Query state, and then caches an explicit null
  session so protected content is not retained.
- Existing Zod contracts validate login, signup, forgot-password, and reset-password submissions.
  Forms display field-level validation messages and controlled authentication errors.
- Login, signup, reset-password, and password-confirmation fields have accessible visibility
  toggles. Form controls are disabled while their requests are pending.
- Signup shows a generic email-verification state when Better Auth does not create a session.
- Forgot-password always shows the same generic success response and does not disclose whether the
  address exists.
- Reset-password requires a non-empty token from the reset URL. Missing, invalid, expired, and
  reused tokens do not receive a client fallback.
- Added focused Vitest coverage for login, signup, logout, session restoration, protected-route
  redirect validation, forgot-password submission, and reset-token enforcement.

## Files changed in Phase 3B

- `src/services/auth/auth.service.ts`
- `src/services/auth/auth.types.ts`
- `src/services/auth/redirects.ts`
- `src/services/auth/auth.service.test.ts`
- `src/services/auth/redirects.test.ts`
- `src/services/auth/mock-auth.service.ts` (removed)
- `src/services/services.smoke.test.ts`
- `src/hooks/useAuth.ts`
- `src/components/auth/LoginForm.tsx`
- `src/components/auth/SignupForm.tsx`
- `src/components/auth/ForgotPasswordForm.tsx`
- `src/components/auth/ResetPasswordForm.tsx`
- `src/routes/_authenticated.tsx`
- `src/routes/login.tsx`
- `src/routes/signup.tsx`
- `CODEX_HANDOFF.md`

No database, migration, PostgreSQL, Redis, Mailpit, Docker, health-route, logging, or CSRF files were
changed in Phase 3B. Conversation and chat services were not replaced.

## Verification

Checkpoint verification on 2026-07-17:

- `npm run typecheck` — passed
- `npm run lint` — passed
- `npm test` — passed: 10 files, 30 tests
- `npm run build` — passed with the Node/Nitro production target
- Client bundle scan for server credential names and PostgreSQL/Redis connection-string patterns —
  no matches

The production build still emits the pre-existing advisory that Vite supports TypeScript path
resolution natively while the project uses `vite-tsconfig-paths`.

## Manual authentication testing

1. Copy `.env.example` to `.env`, replace the local PostgreSQL password and `SESSION_SECRET`
   placeholders, and keep `BETTER_AUTH_URL` aligned with the browser origin (normally
   `http://localhost:8080`).
2. Start dependencies with `docker compose up -d postgres redis mailpit`.
3. Apply the checked-in Phase 3A migration with `npm run db:migrate`.
4. Start Aster with `npm run dev`, then open the exact origin configured by `BETTER_AUTH_URL`.
5. Sign up with a new address. Confirm the form shows the generic verification message and does not
   enter the protected app before verification.
6. Open Mailpit at `http://localhost:8025`, follow the verification link, and confirm the verified
   session reaches `/chat`.
7. Refresh `/chat` and confirm the session is restored. Open `/login` and `/signup` while signed in
   and confirm both redirect to `/chat`.
8. Sign out from the sidebar or settings. Confirm the app reaches `/login`, protected data is
   cleared, and opening `/chat` or `/settings` redirects to login.
9. Sign in with an incorrect password and confirm only the controlled generic error appears. Then
   sign in with the verified credentials and confirm `/chat` loads.
10. Submit forgot-password for both an existing and a non-existing address. Confirm the same generic
    success text appears in both cases and that only the existing account receives mail in Mailpit.
11. Follow the Mailpit reset link, set a valid new password, and confirm the old password and old
    sessions no longer work. Confirm a missing, altered, or reused token shows an invalid/expired
    error and never submits a fake token.
12. Try `/login?redirect=https://evil.test`, `/login?redirect=//evil.test`, and an unlisted internal
    path. After login, confirm each falls back to `/chat`; `/chat` and `/settings` remain accepted.

## Known limitations

- The focused frontend tests mock `fetch`; there is no automated browser E2E suite that starts live
  PostgreSQL, Redis, and Mailpit. The existing Phase 3A backend integration tests remain in place.
- Protected-route verification is performed by a browser request to the server session endpoint.
  The protected layout renders only a loading state until that request completes.
- The intentionally small redirect allowlist does not preserve conversation-specific URLs.
- Mailpit is development-only; no production email provider or delivery/retry strategy is present.
- Database migrations remain a manual setup step.
- Conversation and message data, assistant responses, and streaming remain mock-backed.
- `npm install` previously reported four moderate transitive dependency audit findings; no forced or
  breaking audit upgrade was introduced in this phase.

## Next recommended phase

The next phase should implement basic conversation and message persistence: add the minimal Drizzle
tables and authenticated server APIs for conversations and messages, always deriving ownership from
the verified server session. Keep Gemini integration and chat streaming deferred until persistence
is working and tested.
