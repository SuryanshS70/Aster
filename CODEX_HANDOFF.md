# Codex Handoff — Aster

## Current checkpoint

Minimal conversation and message persistence is complete. Aster remains a TanStack Start modular
monolith and preserves the existing Lovable chat interface.

Authentication continues to use the Phase 3A/3B Better Auth architecture. Conversations and
messages now persist in PostgreSQL and are always scoped to the verified session user. The existing
simulated assistant response remains temporary and is persisted after it finishes.

## Implemented

- Added only `conversations` and `messages` tables.
- Conversations contain `id`, `userId`, `title`, `createdAt`, and `updatedAt`.
- Messages contain `id`, `conversationId`, `role`, `content`, and `createdAt`.
- Conversation deletion cascades to its messages. Conversation ownership and message ordering have
  the only additional indexes.
- Message roles are restricted to `user` and `assistant` in both Zod and PostgreSQL.
- Added authenticated APIs for conversation CRUD and conversation message listing/creation.
- Every query derives the user ID from `auth.api.getSession` and scopes conversation access to it.
- Missing and foreign conversations both return the controlled 404 response.
- Replaced the mock conversation and message storage services with credentialed HTTP requests.
- Sending a message persists the user message, streams the same simulated response locally, then
  persists the completed assistant response.
- Existing create, open, rename, delete, send, refresh, and logout/cache-clear flows are preserved.

## Migration

Checked-in migration: `drizzle/0001_wandering_zuras.sql` plus its generated snapshot and journal
entry.

It creates:

- `conversations`, with a cascading foreign key to the existing `user` table and the composite
  `conversations_user_updated_idx` index.
- `messages`, with a cascading foreign key to `conversations`, a user/assistant role check, and the
  composite `messages_conversation_created_idx` index.

No existing authentication table was altered.

## Main files changed

- `src/server/db/chat-schema.ts`
- `src/server/db/schema.ts`
- `src/server/chat/chat.server.ts`
- `src/routes/api.conversations.ts`
- `src/routes/api.conversations.$conversationId.ts`
- `src/routes/api.conversations.$conversationId.messages.ts`
- `src/contracts/messages.ts`
- `src/server/http/responses.server.ts`
- `src/services/conversations/conversation.service.ts`
- `src/services/chat/chat.service.ts`
- `src/services/conversations/mock-conversation.service.ts` (removed)
- `src/services/chat/mock-chat.service.ts` (removed)
- `src/server/chat/chat.server.test.ts`
- `src/services/persistence.service.test.ts`
- `src/routeTree.gen.ts`
- `drizzle/0001_wandering_zuras.sql`
- `drizzle/meta/0001_snapshot.json`
- `drizzle/meta/_journal.json`

## API routes

- `GET /api/conversations`
- `POST /api/conversations`
- `GET /api/conversations/:id`
- `PATCH /api/conversations/:id`
- `DELETE /api/conversations/:id`
- `GET /api/conversations/:id/messages`
- `POST /api/conversations/:id/messages`

## Verification

Checkpoint verification on 2026-07-17:

- `npm run db:generate` — passed; generated one migration
- `npm run db:migrate` — passed against the configured local PostgreSQL database
- `npm run typecheck` — passed
- `npm run lint` — passed
- `npm test` — passed: 11 files, 35 tests
- `npm run build` — passed with the Node/Nitro production target

Focused tests cover conversation creation/listing/rename/deletion, message persistence, cascade
behavior, unauthenticated requests, cross-user isolation, and frontend HTTP request mapping.

## Manual testing

1. Start PostgreSQL, Redis, and Mailpit, then run `npm run db:migrate` and `npm run dev`.
2. Sign in, create a new chat, send a message, and wait for the simulated assistant response.
3. Refresh the page and confirm both messages and the conversation remain.
4. Rename the conversation, refresh, and confirm the title remains.
5. Delete the conversation and confirm it and its messages do not return after refresh.
6. Sign out and confirm conversation/message query caches are cleared.
7. With two verified accounts, confirm one account cannot open the other account's conversation URL.

## Known limitations

- The assistant response is still simulated in the browser; there is no Gemini call yet.
- Regeneration appends a newly simulated assistant response because message deletion/replacement was
  intentionally not added.
- There is no pagination, search, sharing, soft deletion, streaming infrastructure, or token
  accounting.
- Mailpit remains development-only.

## Next task

The next task should be minimal Gemini integration: replace only the simulated assistant generation
with one authenticated, server-side Gemini call while preserving the current persistence model and
keeping the Gemini API key server-only. Do not add SSE, WebSockets, generation-run tables, token
accounting, or other production-scale infrastructure in that phase.
