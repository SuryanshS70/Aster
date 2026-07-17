import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthCard } from "@/components/auth/AuthCard";
import { LoginForm } from "@/components/auth/LoginForm";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useSession } from "@/hooks/useAuth";
import { getAllowedAuthRedirect } from "@/services/auth/redirects";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => {
    const redirect = getAllowedAuthRedirect(search.redirect);
    return redirect ? { redirect } : {};
  },
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
  const navigate = useNavigate();
  const { data: session, isLoading } = useSession();

  useEffect(() => {
    if (session) navigate({ to: "/chat", replace: true });
  }, [navigate, session]);

  if (isLoading || session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner className="h-6 w-6" />
      </div>
    );
  }

  return (
    <AuthLayout heading="Welcome back!" subheading="Sign in to continue where you left off.">
      <AuthCard title="Sign into Aster">
        <LoginForm />
      </AuthCard>
    </AuthLayout>
  );
}
