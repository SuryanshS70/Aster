# Codex Handoff — Aster Frontend

This document is the complete brief for wiring a real backend into the Aster frontend. The UI, routing, form validation, streaming behaviour, and state management are already implemented against a mock service layer. Your job is to replace the mock implementations with real HTTP-backed ones — the component tree does not need to change.

---

## 1. Project overview

Aster is a minimal AI chat app. Users sign in, create conversations, and stream responses from an assistant.

**Frontend stack:** React 19, TypeScript (strict), Vite 8, TanStack Start (file-based routing) + TanStack Query, Tailwind v4, shadcn/ui, Zod.

### Routes

| Path | Auth | Purpose |
| --- | --- | --- |
| `/` | — | Redirects to `/chat` (signed in) or `/login` |
| `/login` | Public | Email + password login |
| `/signup` | Public | Create account |
| `/forgot-password` | Public | Request reset email |
| `/reset-password` | Public | Submit new password with token |
| `/chat` | Protected | New-chat landing (`EmptyChat`) |
| `/chat/$conversationId` | Protected | Conversation view + streaming composer |
| `/settings` | Protected | Profile + sign out |
| `*` | — | 404 handled by root `notFoundComponent` |

Route protection lives in `src/routes/_authenticated.tsx` — it currently reads `useSession()` and redirects to `/login` if there is no session. Swap this out for the same shape once real auth exists; no other change is required.

### Main user flows

1. Sign up / log in → `/chat`.
2. Click "New chat" or a suggestion → creates a conversation → navigates to `/chat/$id` → first message is sent automatically (passed via `search.initial`).
3. Send a message → optimistic user bubble → streaming assistant bubble → invalidates `messages` + `conversations` queries.
4. Stop, regenerate, copy, rename, delete are all wired through the service layer.
5. Sign out clears the query cache and returns to `/login`.

---

## 2. Current implementation

### Fully implemented (frontend)

- All routes, layouts, and 404 / error boundaries.
- All auth forms (login, signup, forgot, reset) with native field validation, loading + disabled states, and generic error messages. Shared Zod contracts live under `src/contracts/` but are not wired into the forms yet.
- Chat UI: sidebar with conversation groups (Today / Yesterday / Earlier), rename + delete controls, new-chat button, mobile sheet, composer with auto-grow, Enter to send, Shift+Enter for newline, streaming cursor, stop button, regenerate + copy.
- TanStack Query cache with per-conversation message keys — switching conversations never shows stale content because the message list is keyed on `conversationId`.
- Design tokens + typography in `src/styles.css` (do not edit without a design brief).

### Currently mocked

Every service call resolves via an in-memory + `localStorage`-backed mock. All mock seed data lives in `src/mocks/mock-data.ts` and is only imported by mock service files — never by components.

- **Auth:** `mockAuthService` persists a session in `localStorage` under `aster.session.v1`. Any email/password combo is accepted; the "user" is derived from the email.
- **Conversations:** `mockConversationService` persists in `aster.conversations.v1`.
- **Chat:** `mockChatService` persists messages under `aster.messages.v1`. `sendMessage()` returns an `AsyncIterable<StreamChunk>` that yields token-sized deltas with small delays to simulate streaming. `stopGeneration()` sets an abort flag consumed by the generator. `regenerateResponse()` drops the last assistant message and re-streams.

---

## 3. Service architecture

Components and hooks import **only** from `@/services` (barrel) or from the hooks in `src/hooks/`. Components never import from `src/mocks/`.

To go live, replace the exported instance in each barrel with an HTTP implementation that satisfies the same interface. The interfaces are the contract — do not widen them at the component level.

### AuthService — `src/services/auth/auth.types.ts`

```ts
interface AuthService {
  getCurrentUser(): Promise<Session | null>;
  login(input: LoginInput): Promise<Session>;
  signup(input: SignupInput): Promise<Session>;
  logout(): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  resetPassword(input: ResetPasswordInput): Promise<void>;
  onAuthChange(cb: (session: Session | null) => void): () => void;
}
```

- Mock: `src/services/auth/mock-auth.service.ts`
- Real implementation goes in a new file, e.g. `src/services/auth/http-auth.service.ts`, and is wired via `src/services/auth/auth.service.ts`.

### ConversationService — `src/services/conversations/conversation.types.ts`

```ts
interface ConversationService {
  getConversations(): Promise<Conversation[]>;
  createConversation(input?: CreateConversationInput): Promise<Conversation>;
  getConversation(id: string): Promise<Conversation>;
  renameConversation(id: string, title: string): Promise<Conversation>;
  deleteConversation(id: string): Promise<void>;
}
```

- Mock: `src/services/conversations/mock-conversation.service.ts`
- Wire real impl via `src/services/conversations/conversation.service.ts`.

### ChatService — `src/services/chat/chat.types.ts`

```ts
interface ChatService {
  getMessages(conversationId: string): Promise<Message[]>;
  sendMessage(input: SendMessageInput): AsyncIterable<StreamChunk>;
  stopGeneration(conversationId: string): Promise<void>;
  regenerateResponse(conversationId: string): AsyncIterable<StreamChunk>;
}

type StreamChunk = { delta: string } | { done: true };
```

- Mock: `src/services/chat/mock-chat.service.ts`
- Wire real impl via `src/services/chat/chat.service.ts`.

Streaming is expressed as `AsyncIterable<StreamChunk>` deliberately — an HTTP implementation can adapt an SSE or fetch/streams response by yielding `{ delta }` chunks and a final `{ done: true }`. `stopGeneration` should abort the in-flight request (e.g. `AbortController`).

### Shared types (single source of truth)

- `User`, `Session`, `LoginInput`, `SignupInput`, `ResetPasswordInput`, `UnauthorizedError`, `RateLimitError` → `src/services/auth/auth.types.ts`
- `Conversation`, `CreateConversationInput`, `ConversationNotFoundError` → `src/services/conversations/conversation.types.ts`
- `Message`, `Role`, `MessageStatus`, `SendMessageInput`, `StreamChunk`, `MessageRateLimitError` → `src/services/chat/chat.types.ts`

All re-exported from `src/services/index.ts`. Do not duplicate these types elsewhere.

---

## 4. Expected backend integration

Codex is expected to implement:

- Real authentication (session/cookie or JWT — the frontend does not care as long as `getCurrentUser` and `onAuthChange` reflect state).
- Protected backend routes with conversation ownership checks.
- Persistent database storage for users, conversations, messages.
- LLM integration with server-side streaming (SSE or chunked fetch).
- Server-side input validation (Zod schemas on the client should be mirrored on the server; never trust the client).
- Rate limiting (map 429 → `RateLimitError` / `MessageRateLimitError`).
- Structured error responses that the frontend can surface as generic error messages.

The frontend must not call an LLM provider directly from the browser.

---

## 5. Recommended backend API contract

These routes are suggestions, not requirements — the only hard contract is the service interfaces above. If you follow this shape, the HTTP implementations of each service become almost mechanical.

| Method + Path | Frontend service method | Request | Response | Notable errors |
| --- | --- | --- | --- | --- |
| `GET /api/me` | `AuthService.getCurrentUser` | — | `Session \| null` | 401 → `null` |
| `POST /api/auth/login` | `AuthService.login` | `LoginInput` | `Session` | 401 → `UnauthorizedError` |
| `POST /api/auth/signup` | `AuthService.signup` | `SignupInput` | `Session` | 409 email exists |
| `POST /api/auth/logout` | `AuthService.logout` | — | `204` | — |
| `POST /api/auth/password-reset` | `AuthService.requestPasswordReset` | `{ email }` | `204` | Always 204 (don't leak account existence) |
| `POST /api/auth/password-reset/confirm` | `AuthService.resetPassword` | `ResetPasswordInput` | `204` | 400 invalid/expired token |
| `GET /api/conversations` | `ConversationService.getConversations` | — | `Conversation[]` | 401 |
| `POST /api/conversations` | `ConversationService.createConversation` | `CreateConversationInput` | `Conversation` | 401 |
| `GET /api/conversations/:id` | `ConversationService.getConversation` | — | `Conversation` | 404 → `ConversationNotFoundError` |
| `PATCH /api/conversations/:id` | `ConversationService.renameConversation` | `{ title }` | `Conversation` | 404 |
| `DELETE /api/conversations/:id` | `ConversationService.deleteConversation` | — | `204` | 404 |
| `GET /api/conversations/:id/messages` | `ChatService.getMessages` | — | `Message[]` | 404 |
| `POST /api/chat/stream` | `ChatService.sendMessage` | `SendMessageInput` | SSE / chunked stream of `StreamChunk` | 429 → `MessageRateLimitError` |
| `POST /api/messages/:messageId/regenerate` (or `/api/conversations/:id/regenerate`) | `ChatService.regenerateResponse` | — | SSE / chunked stream of `StreamChunk` | 429 |

Streaming endpoints should terminate with a `{ "done": true }` event so the client's `for await` loop exits cleanly. Aborting a stream is a client-side `AbortController.abort()` — the server just needs to handle the closed connection.

---

## 6. Environment variables

The frontend currently uses **no** environment variables and contains no real secrets. When adding a real backend, expose only public config as `VITE_*` (e.g. `VITE_API_BASE_URL`). All private keys (LLM provider keys, DB credentials, JWT secrets, session secrets) must live server-side only.

The committed `.env.example` contains empty placeholders only; its server-side variables are reserved for later phases and are not used by the current frontend.

---

## 7. Commands

```bash
npm install        # install
npm run dev        # dev server on http://localhost:8080
npm run build      # production build
npm run build:dev  # dev-mode build (CI/preview)
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm test           # Vitest baseline tests
npm run format     # Prettier
```

Vitest is configured with shared-contract tests and a smoke test for the current mock service layer. Backend integration and end-to-end tests do not exist yet.

---

## 8. Known limitations / remaining mock-only behaviour

- All auth is mocked — any email/password logs in, "password reset" is a no-op that resolves successfully.
- Conversations, messages, and sessions persist only in `localStorage`, per browser.
- Assistant responses are a hardcoded template streamed token-by-token from `mockResponseTokens()` in `src/mocks/mock-data.ts`. There is no LLM.
- `stopGeneration` sets an in-process flag; there is no server to abort.
- Conversation rename uses `window.prompt` and delete uses `window.confirm` as intentionally minimal UI stand-ins — swap for a shadcn dialog if desired.
- Only baseline contract/service smoke tests; no backend integration tests, end-to-end tests, telemetry, or analytics.
- No real security posture: RLS, authorization, ownership checks, rate limiting, and CSRF protection are all backend responsibilities that do not exist yet.

**Confirmed:** the repository contains no API keys, service-role keys, database credentials, private tokens, hardcoded secrets, real user passwords, or direct browser calls to any LLM provider.
