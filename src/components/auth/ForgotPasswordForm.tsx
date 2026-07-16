import { useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useRequestPasswordReset } from "@/hooks/useAuth";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const reset = useRequestPasswordReset();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await reset.mutateAsync(email).catch(() => {});
  }

  if (reset.isSuccess) {
    return (
      <div className="space-y-4 text-sm">
        <p>
          If an account exists for <span className="font-medium">{email}</span>, we've sent a reset
          link.
        </p>
        <Link to="/login" className="text-primary hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </div>
      <Button type="submit" className="w-full" disabled={reset.isPending}>
        {reset.isPending ? <LoadingSpinner className="mr-2" /> : null}
        Send reset link
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Remembered it?{" "}
        <Link to="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
