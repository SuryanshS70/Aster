import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthCard } from "@/components/auth/AuthCard";
import { SignupForm } from "@/components/auth/SignupForm";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useSession } from "@/hooks/useAuth";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create your account — Aster" },
      {
        name: "description",
        content: "Create an Aster account and start chatting in seconds.",
      },
      { property: "og:title", content: "Create your account — Aster" },
      {
        property: "og:description",
        content: "Create an Aster account and start chatting in seconds.",
      },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
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
    <AuthLayout heading="Say hello to Aster." subheading="Create your account to get started.">
      <AuthCard title="Create your account">
        <SignupForm />
      </AuthCard>
    </AuthLayout>
  );
}
