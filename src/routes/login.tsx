import { createFileRoute } from "@tanstack/react-router";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthCard } from "@/components/auth/AuthCard";
import { LoginForm } from "@/components/auth/LoginForm";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Aster" },
      { name: "description", content: "Sign in to your Aster account." },
      { property: "og:title", content: "Sign in — Aster" },
      { property: "og:description", content: "Sign in to your Aster account." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  return (
    <AuthLayout
      heading="Welcome back!"
      subheading="Sign in to continue where you left off."
    >
      <AuthCard title="Sign into Aster">
        <LoginForm />
      </AuthCard>
    </AuthLayout>
  );
}
