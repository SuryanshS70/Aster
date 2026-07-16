import { createFileRoute } from "@tanstack/react-router";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthCard } from "@/components/auth/AuthCard";
import { SignupForm } from "@/components/auth/SignupForm";

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
  return (
    <AuthLayout heading="Say hello to Aster." subheading="Create your account to get started.">
      <AuthCard title="Create your account">
        <SignupForm />
      </AuthCard>
    </AuthLayout>
  );
}
