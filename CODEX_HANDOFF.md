# Codex Handoff - Aster

## Current checkpoint

Minimal authenticated Projects and document-grounded chat are complete. Aster remains a TanStack Start modular monolith with Better Auth, PostgreSQL persistence, server-only Gemini generation, and the Lovable chat interface.

Users can create a project, upload a PDF or UTF-8 text document, and create persistent project chats. The server extracts and stores document text, selects a small set of relevant chunks for each question, and supplies them to Gemini without exposing document data or secrets to the browser.

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
- Added authenticated project CRUD and project-document list/upload/delete endpoints.
- Added `projects`, `project_documents`, and nullable `conversations.project_id` in `drizzle/0003_petite_inhumans.sql`.
- Project deletion cascades to documents, project conversations, and their messages.
- A composite project/user foreign key prevents a conversation from referencing another user's project.
- PDF and UTF-8 plain-text uploads are limited to 5 MB and processed synchronously.
- Raw files are not retained; PostgreSQL stores document metadata, status, errors, and extracted text.
- Project text is split into overlapping chunks and ranked lexically for each question.
- At most four chunks and 5,600 characters of document context are sent to Gemini.
- Document text is passed as untrusted user-level reference context, not as a system instruction.
- Added Projects list/detail screens, document states, project chat links, and a project-knowledge banner.
- Added focused ownership, processing, retrieval, generation-context, and frontend mapping tests.

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
- `src/contracts/projects.ts`
- `src/server/db/project-schema.ts`
- `src/server/projects/document-processing.server.ts`
- `src/server/projects/retrieval.server.ts`
- `src/server/projects/projects.server.ts`
- `src/routes/api.projects*.ts`
- `src/services/projects/*`
- `src/hooks/useProjects.ts`
- `src/routes/_authenticated.projects*.tsx`
- `drizzle/0003_petite_inhumans.sql`
- Project-aware updates to the conversation schema, chat server, Gemini provider, sidebar, and chat route
- Focused project server, processing, retrieval, contract, and service tests
- `src/hooks/useModelPreference.ts`
- `src/components/settings/ModelSettings.tsx`
- `drizzle/0002_small_thena.sql`
- Focused server, environment, frontend mapping, and server-boundary tests

## Verification

Checkpoint verification on 2026-07-22:

- `npm run typecheck` - passed
- `npm run lint` - passed
- `npm test` - passed: 16 files, 60 tests
- `npm run build` - passed with the Node/Nitro production target
- Built browser assets contain no `@google/genai`, `GEMINI_API_KEY`, `GEMINI_MODEL`, or `pdf-parse` references

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

13. Open Projects from the user menu and create a project.
14. Upload a small UTF-8 `.txt` file and confirm its status becomes Ready.
15. Upload a text-based PDF and confirm extraction becomes Ready.
16. Create a project chat, ask a question answered by the document, and confirm Gemini uses it.
17. Ask for information absent from the document and confirm Gemini says it was not found.
18. Refresh the chat and confirm the project banner and message history remain.
19. With a second account, confirm the project, documents, and project chats return 404.
20. Delete the project and confirm its documents and project chats disappear.

## Known limitations

- Generation is non-streaming, so the response appears after Gemini completes.
- Browser abort does not cancel work already running at Gemini or on the server; a completed request may still be persisted after the browser stops waiting.
- Context is limited to the latest 20 messages with no summarization.
- Retrieval is lexical chunk scoring, not embeddings or semantic/vector search.
- PDF extraction supports text-based PDFs only; there is no OCR for scanned pages.
- Upload processing is synchronous, and raw uploaded files are not retained.
- Each document is limited to 5 MB and extracted text to 2,000,000 characters.
- There is no background job system, collaborative projects, sharing, cloud file storage, or web crawling.
- There is no token/cost accounting, quotas, moderation layer, tools, search, or server-side generation cancellation.
