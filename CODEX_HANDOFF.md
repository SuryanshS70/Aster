# Codex Handoff - Aster

## Current checkpoint

Minimal per-user Gemini model selection is complete. Aster remains a TanStack Start modular monolith with the existing Better Auth session flow, PostgreSQL conversation/message persistence, and Lovable chat interface.

The browser sends one non-streaming generation request. The authenticated server validates ownership, loads the user's approved model preference, supplies a bounded conversation history to Gemini, and persists the returned user and assistant messages together.

## Implemented

- Installed the official `@google/genai` package.
- Added one `.server.ts` Gemini provider with a short general-purpose Aster instruction.
- Added authenticated `POST /api/conversations/:id/generate` with shared Zod validation.
- The endpoint derives the user ID from the verified Better Auth session and returns the same 404 for missing and foreign conversations.
- Only the most recent 20 persisted messages are supplied as context, followed by the new message.
- Successful generations persist the user message and assistant response in one transaction and update the conversation title and `updatedAt` timestamp.
- Provider/configuration failures return a generic controlled 502 response without provider details.
- `ChatService.sendMessage` makes one credentialed generation request and does not insert the user message separately.
- Assistant Markdown is formatted, and an animated thinking indicator remains visible while Gemini is working.
- Added authenticated `POST /api/conversations/:id/regenerate`; it reuses the latest persisted user prompt and replaces the latest assistant message without duplicating history.
- New conversations use the first prompt as their automatic title; later prompts never overwrite that title or a manual rename.
- The stop action aborts the browser request only.
- Gemini configuration and SDK imports remain server-only; no `VITE_` Gemini variables were added.
- The authenticated Settings page lets each user select one of three approved Gemini models with loading, saving, success, and error states.
- Added authenticated `GET` and `PATCH /api/settings/model` endpoints with a strict three-model Zod allowlist.
- Added `user.model_preference` with a database default of `gemini-3.5-flash` in `drizzle/0002_small_thena.sql`.
- Generation and regeneration load the authenticated user's stored preference before calling Gemini.
- The Gemini API key, SDK, and final model choice remain server-only.

## Required environment variables

Set this in the local `.env` before starting the app:

```dotenv
GEMINI_API_KEY=<your-api-key>
```

The model is selected per user in Settings, so `GEMINI_MODEL` is no longer used. A missing API key does not prevent the rest of Aster from starting, but generation returns the controlled unavailable error.

## Main files changed

- `.env.example`
- `package.json`
- `package-lock.json`
- `src/server/config/env.server.ts`
- `src/server/gemini/gemini.server.ts`
- `src/server/chat/chat.server.ts`
- `src/routes/api.conversations.$conversationId.generate.ts`
- `src/routes/api.conversations.$conversationId.regenerate.ts`
- `src/contracts/messages.ts`
- `src/services/chat/chat.service.ts`
- `src/components/chat/MessageBubble.tsx`
- `src/components/chat/TypingIndicator.tsx`
- `src/routeTree.gen.ts`
- `src/contracts/model-preference.ts`
- `src/server/db/auth-schema.ts`
- `src/server/settings/model-preference.server.ts`
- `src/routes/api.settings.model.ts`
- `src/services/settings/model-preference.service.ts`
- `src/hooks/useModelPreference.ts`
- `src/components/settings/ModelSettings.tsx`
- `drizzle/0002_small_thena.sql`
- Focused server, environment, frontend mapping, and server-boundary tests

## Verification

Checkpoint verification on 2026-07-22:

- `npm run typecheck` - passed
- `npm run lint` - passed
- `npm test` - passed: 13 files, 49 tests
- `npm run build` - passed with the Node/Nitro production target
- Built browser assets contain no `@google/genai`, `GEMINI_API_KEY`, or `GEMINI_MODEL` references

Focused tests additionally cover the model allowlist, unauthenticated settings access, per-user preference updates, frontend request mapping, and passing the authenticated user's selected model to Gemini.

## Manual testing

1. Apply migrations with `npm run db:migrate`.
2. Add `GEMINI_API_KEY` to the local `.env`, then restart `npm run dev`.
3. Sign in and open Settings from the existing user menu.
4. Confirm Gemini 3.5 Flash is selected for an existing user with no prior preference.
5. Select another approved model, save it, refresh Settings, and confirm the choice remains.
6. Create or open a conversation, send a message, and confirm Gemini responds using the saved model.
7. Switch models, send another prompt, and confirm generation continues normally.
8. Refresh the chat and confirm both user and assistant messages remain.
9. Start a request and press stop; confirm the browser stops waiting without a UI redesign.
10. Temporarily use an invalid local key, restart, and confirm the browser shows only the generic generation error. Restore the valid key afterward.
11. With two accounts, confirm their saved model selections remain independent.
12. Click Regenerate on the latest assistant response and confirm its content is replaced without adding another user message.

## Known limitations

- Generation is non-streaming, so the response appears after Gemini completes.
- Browser abort does not cancel work already running at Gemini or on the server; a completed request may still be persisted after the browser stops waiting.
- Context is limited to the latest 20 messages with no summarization.
- There is no token/cost accounting, quotas, moderation layer, tools, search, RAG, uploads, or server-side generation cancellation.
