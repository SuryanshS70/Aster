import { useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { passwordResetRequestSchema } from "@/contracts/auth";
import { useRequestPasswordReset } from "@/hooks/useAuth";
import { RateLimitError } from "@/services";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string>();
  const reset = useRequestPasswordReset();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    reset.reset();
    const result = passwordResetRequestSchema.safeParse({ email });
    if (!result.success) {
      setEmailError(result.error.issues[0]?.message ?? "Enter a valid email address");
      return;
    }
    setEmailError(undefined);
    await reset.mutateAsync(result.data.email).catch(() => {});
  }

  if (reset.isSuccess) {
    return (
      <div className="space-y-4 text-sm">
        <p>If an account exists for that address, we've sent a reset link.</p>
        <Link to="/login" className="text-primary hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {reset.error && (
        <Alert variant="destructive">
          <AlertDescription>
            {reset.error instanceof RateLimitError
              ? reset.error.message
              : "Couldn't send a reset link. Please try again."}
          </AlertDescription>
        </Alert>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          disabled={reset.isPending}
          aria-invalid={Boolean(emailError)}
          aria-describedby={emailError ? "email-error" : undefined}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setEmailError(undefined);
          }}
          placeholder="you@example.com"
        />
        {emailError && (
          <p id="email-error" className="text-xs text-destructive">
            {emailError}
          </p>
        )}
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
