import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { loginInputSchema } from "@/contracts/auth";
import { useLogin } from "@/hooks/useAuth";
import { RateLimitError } from "@/services";
import { getAuthRedirect } from "@/services/auth/redirects";

export function LoginForm() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { redirect?: string };
  const login = useLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    login.reset();
    const result = loginInputSchema.safeParse({ email, password });
    if (!result.success) {
      const next: typeof fieldErrors = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0];
        if ((field === "email" || field === "password") && !next[field]) {
          next[field] = issue.message;
        }
      });
      setFieldErrors(next);
      return;
    }
    setFieldErrors({});
    try {
      await login.mutateAsync(result.data);
      navigate({ to: getAuthRedirect(search.redirect) });
    } catch {
      /* handled via login.error */
    }
  }

  const errorMessage =
    login.error instanceof RateLimitError
      ? login.error.message
      : "We couldn't sign you in. Check your email and password.";

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {login.error && (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          disabled={login.isPending}
          aria-invalid={Boolean(fieldErrors.email)}
          aria-describedby={fieldErrors.email ? "email-error" : undefined}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setFieldErrors((current) => ({ ...current, email: undefined }));
          }}
          placeholder="you@example.com"
        />
        {fieldErrors.email && (
          <p id="email-error" className="text-xs text-destructive">
            {fieldErrors.email}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link
            to="/forgot-password"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Forgot?
          </Link>
        </div>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            disabled={login.isPending}
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
            disabled={login.isPending}
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

      <Button type="submit" className="w-full" disabled={login.isPending}>
        {login.isPending ? <LoadingSpinner className="mr-2" /> : null}
        Continue with email
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Don't have an account?{" "}
        <Link to="/signup" className="font-medium text-primary hover:underline">
          Sign up
        </Link>
      </p>
    </form>
  );
}
