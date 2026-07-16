import { createFileRoute } from "@tanstack/react-router";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthCard } from "@/components/auth/AuthCard";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password — Aster" },
      { name: "description", content: "Choose a new password for your Aster account." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPage,
});

function ResetPage() {
  return (
    <AuthLayout heading="Set a new password" subheading="Choose something you'll remember.">
      <AuthCard title="New password">
        <ResetPasswordForm />
      </AuthCard>
    </AuthLayout>
  );
}
