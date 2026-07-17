# Codex Handoff - Aster

## Current checkpoint

Minimal Gemini integration is complete. Aster remains a TanStack Start modular monolith with the existing Better Auth session flow, PostgreSQL conversation/message persistence, and Lovable chat interface.

The browser sends one non-streaming generation request. The authenticated server validates ownership, supplies a bounded conversation history to Gemini, and persists the returned user and assistant messages together.

## Implemented

- Installed the official `@google/genai` package.
- Added one `.server.ts` Gemini provider with a short general-purpose Aster instruction.
- Added authenticated `POST /api/conversations/:id/generate` with shared Zod validation.
- The endpoint derives the user ID from the verified Better Auth session and returns the same 404 for missing and foreign conversations.
- Only the most recent 20 persisted messages are supplied as context, followed by the new message.
- Successful generations persist the user message and assistant response in one transaction and update the conversation title and `updatedAt` timestamp.
- Provider/configuration failures return a generic controlled 502 response without provider details.
- `ChatService.sendMessage` makes one credentialed generation request and does not insert the user message separately.
- The existing loading/optimistic UI is retained. The stop action aborts the browser request only.
- Gemini configuration and SDK imports remain server-only; no `VITE_` Gemini variables were added.
- No database schema or migration was changed.

## Required environment variables

Set these in the local `.env` before starting the app:

```dotenv
GEMINI_API_KEY=<your-api-key>
GEMINI_MODEL=<model-id-enabled-for-that-key>
```

The checked-in `.env.example` intentionally leaves both values blank. A missing value does not prevent the rest of Aster from starting, but generation returns the controlled unavailable error.

## Main files changed

- `.env.example`
- `package.json`
- `package-lock.json`
- `src/server/config/env.server.ts`
- `src/server/gemini/gemini.server.ts`
- `src/server/chat/chat.server.ts`
- `src/routes/api.conversations.$conversationId.generate.ts`
- `src/contracts/messages.ts`
- `src/services/chat/chat.service.ts`
- `src/routeTree.gen.ts`
- Focused server, environment, frontend mapping, and server-boundary tests

## Verification

Checkpoint verification on 2026-07-17:

- `npm run typecheck` - passed
- `npm run lint` - passed
- `npm test` - passed
- `npm run build` - passed with the Node/Nitro production target
- Built browser assets contain no `@google/genai`, `GEMINI_API_KEY`, or `GEMINI_MODEL` references

Focused tests cover unauthenticated rejection, ownership enforcement, successful mocked generation, controlled provider failure, message-pair persistence, latest-20 context, frontend request mapping, and the server-only Gemini boundary.

## Manual testing

1. Add `GEMINI_API_KEY` and `GEMINI_MODEL` to the local `.env`, then restart `npm run dev`.
2. Sign in, create or open a conversation, send a message, and confirm Gemini's response appears.
3. Refresh the page and confirm both the user and assistant messages remain.
4. Send more than 20 messages and confirm generation continues normally with bounded context.
5. Start a request and press stop; confirm the browser stops waiting without a UI redesign.
6. Temporarily use an invalid local key, restart, and confirm the browser shows only the generic generation error. Restore the valid key afterward.
7. With two accounts, confirm one account receives 404 when attempting to generate against the other account's conversation ID.

## Known limitations

- Generation is non-streaming, so the response appears after Gemini completes.
- Browser abort does not cancel work already running at Gemini or on the server; a completed request may still be persisted after the browser stops waiting.
- Context is limited to the latest 20 messages with no summarization.
- Regeneration is intentionally unavailable because safe replace/regenerate semantics were outside this phase; this prevents duplicate user-message insertion.
- There is no token/cost accounting, quotas, moderation layer, tools, search, RAG, uploads, model selector, or server-side generation cancellation.
