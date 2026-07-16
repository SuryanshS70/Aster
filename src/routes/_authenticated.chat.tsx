import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/chat")({
  head: () => ({
    meta: [{ title: "Chat — Aster" }, { name: "description", content: "Chat with Aster." }],
  }),
  component: () => <Outlet />,
});
