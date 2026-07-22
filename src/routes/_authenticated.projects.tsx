import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/projects")({
  head: () => ({
    meta: [
      { title: "Projects ? Aster" },
      { name: "description", content: "Chat with your project documents." },
    ],
  }),
  component: () => <Outlet />,
});
