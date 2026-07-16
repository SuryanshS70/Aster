# Aster

A calm, minimal AI chat application built as a TanStack Start modular monolith. Phase 3A added the server-side authentication foundation; conversation persistence and LLM integration remain future work.

The existing Lovable frontend still uses mock services for authentication, conversations, and chat, so it remains clickable without dependencies. Better Auth endpoints now exist on the server, but frontend authentication integration is deferred to Phase 3B.

## Tech stack

- React 19 + TypeScript
- Vite 8
- TanStack Start (file-based routing) + TanStack Query
- Tailwind CSS v4
- shadcn/ui + Radix primitives
- Zod shared validation contracts
- Vitest
- Lucide icons
- Better Auth + Drizzle ORM + PostgreSQL
- Redis authentication rate limiting
- Nodemailer + Mailpit development email

## Getting started

```bash
npm install
npm run dev          # http://localhost:8080
npm run build        # production build
npm run build:dev    # dev-mode build (used by CI/preview)
npm run lint         # ESLint
npm run typecheck    # TypeScript --noEmit
npm test             # Vitest test suite
npm run format       # Prettier
npm run db:generate  # generate Drizzle migrations
npm run db:migrate   # apply checked-in migrations
```

Requires Node.js 20+.

## Folder structure

```
src/
├── components/
│   ├── auth/          Auth forms (login, signup, forgot, reset) + auth layout
│   ├── chat/          ChatShell, Sidebar, TopBar, MessageList, Composer, ...
│   ├── common/        Logo, Loading, Empty, Error states
│   └── ui/            shadcn primitives
├── contracts/         Shared Zod schemas + inferred request/domain types
├── hooks/             useAuth, useConversations, useMessages, queryKeys
├── lib/               utils + error reporting
├── mocks/             mock-data.ts — the ONLY place that seeds mock data
├── routes/            TanStack Start file-based routes
├── services/
│   ├── auth/          AuthService interface + mock implementation
│   ├── conversations/ ConversationService interface + mock implementation
│   ├── chat/          ChatService interface + mock implementation
│   └── index.ts       Public re-exports
├── server/            Server-only config, database, Redis, HTTP, and auth
├── router.tsx         Router bootstrap
├── styles.css         Tailwind v4 theme + design tokens
└── start.ts           TanStack Start entry
```

## Phase 3A status

The application server now provides:

- Better Auth at `/api/auth/*`
- PostgreSQL-backed users, credentials, verification records, and sessions
- Required email verification and password-reset flows
- Secure authentication cookies and CSRF/trusted-origin validation
- Redis-backed authentication rate limiting
- Mailpit email capture for local verification and reset testing

Apply `drizzle/0000_familiar_the_anarchist.sql` with `npm run db:migrate` before using authentication. Copy `.env.example` to `.env`, replace its security placeholders, start PostgreSQL, Redis, and Mailpit with `docker compose up -d postgres redis mailpit`, then run `npm run dev`. Mailpit is available at `http://localhost:8025`.

## Still mock-backed

- The browser-facing `AuthService` and current client route protection
- Conversations and messages
- Simulated assistant streaming and generation cancellation

Phase 3B must only connect the existing Lovable auth UI and route/session flows to Better Auth. It must not add conversation/message persistence, Gemini, chat streaming, optional providers, or additional infrastructure. See [`CODEX_HANDOFF.md`](./CODEX_HANDOFF.md) for the exact checkpoint and next-task scope.
