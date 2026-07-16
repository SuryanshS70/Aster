import { createFileRoute } from "@tanstack/react-router";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthCard } from "@/components/auth/AuthCard";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset your password — Aster" },
      { name: "description", content: "Send yourself a password reset link." },
    ],
  }),
  component: ForgotPage,
});

function ForgotPage() {
  return (
    <AuthLayout heading="Forgot your password?" subheading="We'll email you a reset link.">
      <AuthCard title="Reset password">
        <ForgotPasswordForm />
      </AuthCard>
    </AuthLayout>
  );
}
