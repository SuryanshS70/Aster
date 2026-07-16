# Aster

A calm, minimal AI chat interface. This repository contains the **frontend only** — the backend, database, authentication, and LLM integration are not implemented and will be added by Codex during the next phase.

Everything data-related currently runs against an in-memory + `localStorage` mock service layer, so you can click through the entire UI (auth, chat streaming, conversation management) without any external services.

## Tech stack

- React 19 + TypeScript
- Vite 8
- TanStack Start (file-based routing) + TanStack Query
- Tailwind CSS v4
- shadcn/ui + Radix primitives
- Zod (form + input validation)
- Lucide icons

## Getting started

```bash
npm install
npm run dev          # http://localhost:8080
npm run build        # production build
npm run build:dev    # dev-mode build (used by CI/preview)
npm run lint         # ESLint
npm run typecheck    # TypeScript --noEmit
npm run format       # Prettier
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
├── hooks/             useAuth, useConversations, useMessages, queryKeys
├── lib/               utils + error reporting
├── mocks/             mock-data.ts — the ONLY place that seeds mock data
├── routes/            TanStack Start file-based routes
├── services/
│   ├── auth/          AuthService interface + mock implementation
│   ├── conversations/ ConversationService interface + mock implementation
│   ├── chat/          ChatService interface + mock implementation
│   └── index.ts       Public re-exports
├── router.tsx         Router bootstrap
├── styles.css         Tailwind v4 theme + design tokens
└── start.ts           TanStack Start entry
```

## Backend status

**The backend is not implemented.** All data operations flow through typed service interfaces (`AuthService`, `ConversationService`, `ChatService`) whose current implementations are mocks under `src/services/*/mock-*.service.ts`. Swap the exported service instance in each `*.service.ts` barrel to a real HTTP-backed implementation to go live — no component changes required.

See [`CODEX_HANDOFF.md`](./CODEX_HANDOFF.md) for the full backend integration brief, expected API contract, and known limitations.
