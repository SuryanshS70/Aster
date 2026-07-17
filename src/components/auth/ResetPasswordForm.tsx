import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { resetPasswordInputSchema } from "@/contracts/auth";
import { useResetPassword } from "@/hooks/useAuth";
import { RateLimitError } from "@/services";

export function ResetPasswordForm() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { token?: string };
  const reset = useResetPassword();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirm?: string }>({});
  const tokenResult = resetPasswordInputSchema.shape.token.safeParse(search.token);
  const token = tokenResult.success ? tokenResult.data : undefined;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    reset.reset();
    if (!token) return;
    const result = resetPasswordInputSchema.safeParse({ token, password });
    const next: typeof fieldErrors = {};
    if (!result.success) {
      next.password = result.error.issues.find((issue) => issue.path[0] === "password")?.message;
    }
    if (password !== confirm) next.confirm = "Passwords don't match.";
    if (!confirm) next.confirm = "Confirm your password.";
    setFieldErrors(next);
    if (!result.success || next.confirm) return;

    try {
      await reset.mutateAsync(result.data);
      navigate({ to: "/login" });
    } catch {
      /* handled via reset.error */
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {!token && (
        <Alert variant="destructive">
          <AlertDescription>Reset link is invalid or missing a token.</AlertDescription>
        </Alert>
      )}
      {reset.error && (
        <Alert variant="destructive">
          <AlertDescription>
            {reset.error instanceof RateLimitError
              ? reset.error.message
              : "Reset link is invalid or expired."}
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="password">New password</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            minLength={8}
            disabled={reset.isPending || !token}
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby={fieldErrors.password ? "password-error" : undefined}
            className="pr-10"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setFieldErrors((current) => ({ ...current, password: undefined }));
            }}
          />
          <button
            type="button"
            disabled={reset.isPending || !token}
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {fieldErrors.password && (
          <p id="password-error" className="text-xs text-destructive">
            {fieldErrors.password}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirm">Confirm password</Label>
        <div className="relative">
          <Input
            id="confirm"
            type={showConfirm ? "text" : "password"}
            autoComplete="new-password"
            required
            disabled={reset.isPending || !token}
            aria-invalid={Boolean(fieldErrors.confirm)}
            aria-describedby={fieldErrors.confirm ? "confirm-error" : undefined}
            className="pr-10"
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value);
              setFieldErrors((current) => ({ ...current, confirm: undefined }));
            }}
          />
          <button
            type="button"
            disabled={reset.isPending || !token}
            onClick={() => setShowConfirm((visible) => !visible)}
            aria-label={showConfirm ? "Hide confirmed password" : "Show confirmed password"}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {fieldErrors.confirm && (
          <p id="confirm-error" className="text-xs text-destructive">
            {fieldErrors.confirm}
          </p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={reset.isPending || !token}>
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
