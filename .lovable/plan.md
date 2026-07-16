# Aster — Frontend Plan

Frontend-only build (React + TypeScript + Vite + Tailwind + shadcn/ui on TanStack Start). All auth, DB, and LLM calls go through a mock service layer with clean interfaces so Codex can swap in real implementations without touching UI code.

## 1. Visual Direction

Inspired by the reference: split-screen auth, warm off-white background, bold serif welcome heading, single card with primary CTA, playful illustrated accent panel on the right. Applied across Aster:

- Palette: warm off-white bg, deep charcoal text, coral/terracotta accent panel, single vibrant primary (violet-indigo) for CTAs.
- Type: serif display (e.g. Instrument Serif / Fraunces) for headings, clean sans (Inter) for body.
- Rounded 12–16px cards, soft shadow, generous whitespace.
- Illustration/blob accent on auth pages only; chat stays minimal and content-first.
- All values as semantic tokens in `src/styles.css` (oklch), no hardcoded colors in components. Light + dark mode.

## 2. Route Structure

TanStack Start file-based routes under `src/routes/`:

```text
/                         → redirect: authed → /chat, guest → /login
/login                    → email + password sign-in (split-screen)
/signup                   → create account (split-screen)
/forgot-password          → request reset link
/reset-password           → set new password (public, reads token)
/_authenticated           → pathless layout, guards children, renders <Outlet/>
  /chat                   → chat shell, auto-selects latest or shows empty state
  /chat/$conversationId   → active conversation
  /settings               → profile, appearance, sign out
404                       → root notFoundComponent
```

Files: `index.tsx`, `login.tsx`, `signup.tsx`, `forgot-password.tsx`, `reset-password.tsx`, `_authenticated.tsx`, `_authenticated.chat.tsx`, `_authenticated.chat.$conversationId.tsx`, `_authenticated.settings.tsx`.

Each route sets its own `head()` (title, description, og:*). `_authenticated.tsx` calls `authService.getSession()` and redirects to `/login` when null.

## 3. Authentication Page Layouts

Shared `<AuthLayout>` = two-column split:

- Left (≈55%, full width on mobile): Aster wordmark top-left, serif welcome heading, `<AuthCard>` with title, fields, primary button, secondary link row, locale switcher.
- Right (hidden < lg): coral panel with organic blob shape and illustration slot.

Pages:

- **Login** — email, password, "Continue", link to signup + forgot password, inline field errors, form-level error alert.
- **Signup** — name, email, password (with strength hint), submit, link to login.
- **Forgot password** — email, submit, success confirmation state.
- **Reset password** — new password + confirm, success → redirect to login.

## 4. Chat Page Layout

Three-region shell inside `_authenticated`:

```text
┌─────────────┬──────────────────────────────────┐
│  Sidebar    │  TopBar (title · model · menu)   │
│  - New chat ├──────────────────────────────────┤
│  - Search   │                                  │
│  - History  │  MessageList (virtualized)       │
│    (grouped │                                  │
│    Today /  │                                  │
│    Yesterday│                                  │
│    /Older)  ├──────────────────────────────────┤
│  - User menu│  Composer (textarea + send)      │
└─────────────┴──────────────────────────────────┘
```

- Streaming assistant messages with typing indicator and stop button.
- Markdown + code blocks with copy button.
- Regenerate / copy / thumbs on each assistant message.
- Auto-scroll with "jump to latest" pill when user scrolls up.
- Empty new-chat state: centered Aster mark, suggested prompt chips.

## 5. Component Hierarchy

```text
src/
├─ routes/                        # route files only
├─ components/
│  ├─ auth/
│  │  ├─ AuthLayout.tsx
│  │  ├─ AuthCard.tsx
│  │  ├─ AuthIllustration.tsx
│  │  ├─ LoginForm.tsx
│  │  ├─ SignupForm.tsx
│  │  ├─ ForgotPasswordForm.tsx
│  │  └─ ResetPasswordForm.tsx
│  ├─ chat/
│  │  ├─ ChatShell.tsx
│  │  ├─ Sidebar.tsx
│  │  ├─ ConversationList.tsx
│  │  ├─ ConversationItem.tsx
│  │  ├─ NewChatButton.tsx
│  │  ├─ TopBar.tsx
│  │  ├─ MessageList.tsx
│  │  ├─ MessageBubble.tsx
│  │  ├─ MarkdownRenderer.tsx
│  │  ├─ TypingIndicator.tsx
│  │  ├─ Composer.tsx
│  │  ├─ EmptyChat.tsx
│  │  └─ SuggestedPrompts.tsx
│  ├─ common/
│  │  ├─ Logo.tsx (Aster wordmark)
│  │  ├─ UserMenu.tsx
│  │  ├─ ThemeToggle.tsx
│  │  ├─ LoadingSpinner.tsx
│  │  ├─ ErrorState.tsx
│  │  └─ EmptyState.tsx
│  └─ ui/                         # shadcn primitives
├─ hooks/
│  ├─ useAuth.ts                  # wraps authService + TanStack Query
│  ├─ useConversations.ts
│  ├─ useMessages.ts
│  ├─ useSendMessage.ts           # optimistic + mock stream
│  └─ useMediaQuery.ts
├─ services/                      # MOCK now, real later
│  ├─ types.ts
│  ├─ authService.ts
│  ├─ conversationService.ts
│  ├─ messageService.ts
│  └─ mock/
│     ├─ fixtures.ts
│     └─ delay.ts
└─ lib/
   └─ utils.ts
```

## 6. Responsive Behavior

- **Desktop ≥ lg**: auth split-screen visible; chat sidebar pinned (280px).
- **Tablet md**: auth collapses to single column, illustration hidden; chat sidebar collapsible to icons.
- **Mobile < md**: sidebar becomes shadcn `<Sheet>` triggered from TopBar hamburger; composer sticks to bottom with safe-area padding; message list fills viewport; textarea auto-grows to max 40vh.
- Tap targets ≥ 44px, focus-visible rings on all interactive elements.

## 7. Loading, Empty, and Error States

Every async surface defines all four:

| Surface | Loading | Empty | Error |
|---|---|---|---|
| Auth submit | Button spinner, disabled form | — | Inline field errors + alert |
| Conversation list | Skeleton rows | "No conversations yet" + New chat CTA | Retry button |
| Message list | Skeleton bubbles | Aster mark + prompt suggestions | Retry + copy error |
| Message send | Optimistic user bubble + streaming assistant with typing dots | — | Failed bubble with retry |
| Route error | — | — | `errorComponent` with Try again + Home |
| 404 | — | — | Root `notFoundComponent` |

Toasts (sonner) for transient success/failure. Session expiry → redirect to `/login?redirect=…`.

## 8. Mock Service Interfaces (Codex handoff contract)

All UI imports from `@/services/*` only. Mocks live behind these signatures; Codex reimplements them without touching components.

```ts
// services/types.ts
export type User = { id: string; email: string; name: string; avatarUrl?: string };
export type Session = { user: User; expiresAt: string };
export type Conversation = { id: string; title: string; createdAt: string; updatedAt: string };
export type Role = "user" | "assistant" | "system";
export type Message = {
  id: string; conversationId: string; role: Role;
  content: string; createdAt: string;
  status?: "pending" | "streaming" | "complete" | "error";
};
export type StreamChunk = { delta: string } | { done: true };

// services/authService.ts
export interface AuthService {
  getSession(): Promise<Session | null>;
  login(input: { email: string; password: string }): Promise<Session>;
  signup(input: { name: string; email: string; password: string }): Promise<Session>;
  logout(): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  resetPassword(input: { token: string; password: string }): Promise<void>;
  onAuthChange(cb: (s: Session | null) => void): () => void;
}

// services/conversationService.ts
export interface ConversationService {
  list(): Promise<Conversation[]>;
  get(id: string): Promise<Conversation>;
  create(input?: { title?: string }): Promise<Conversation>;
  rename(id: string, title: string): Promise<Conversation>;
  remove(id: string): Promise<void>;
}

// services/messageService.ts
export interface MessageService {
  list(conversationId: string): Promise<Message[]>;
  send(input: { conversationId: string; content: string }): AsyncIterable<StreamChunk>;
  stop(conversationId: string): Promise<void>;
}
```

Mock behavior: `delay(200–600ms)`, in-memory + `localStorage` persistence, `send()` yields chunked lorem tokens to exercise streaming UI. Fixtures include 3 seeded conversations.

## 9. Handoff Structure for Codex

- `src/services/README.md` documenting each interface, expected errors (`UnauthorizedError`, `NotFoundError`, `RateLimitError`), and the swap points.
- Zod schemas in `services/types.ts` for request validation (reusable server-side).
- No direct `fetch`, Supabase, or LLM SDK imports anywhere in `components/`, `routes/`, or `hooks/` — only through services.
- Env-var placeholders documented in `.env.example` (no values committed).
- All copy strings colocated with components (easy to grep) — no i18n framework yet.
- Route guard logic isolated in `_authenticated.tsx` so Codex only replaces `authService.getSession`.
- TanStack Query keys centralized in `hooks/queryKeys.ts` for consistent invalidation.

## Out of scope (Codex will own)

Real auth, DB, RLS, LLM streaming, rate limits, billing, analytics, email delivery.
