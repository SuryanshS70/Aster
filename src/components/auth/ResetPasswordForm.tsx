import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useResetPassword } from "@/hooks/useAuth";

export function ResetPasswordForm() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { token?: string };
  const reset = useResetPassword();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const mismatch = confirm.length > 0 && password !== confirm;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (mismatch) return;
    try {
      await reset.mutateAsync({ token: search.token ?? "mock-token", password });
      navigate({ to: "/login" });
    } catch {
      /* handled via reset.error */
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {reset.error && (
        <Alert variant="destructive">
          <AlertDescription>Reset link is invalid or expired.</AlertDescription>
        </Alert>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirm">Confirm password</Label>
        <Input
          id="confirm"
          type="password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        {mismatch && (
          <p className="text-xs text-destructive">Passwords don't match.</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={reset.isPending || mismatch}>
        {reset.isPending ? <LoadingSpinner className="mr-2" /> : null}
        Update password
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        <Link to="/login" className="text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
