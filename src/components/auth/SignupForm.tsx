import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { signupInputSchema } from "@/contracts/auth";
import { useSignup } from "@/hooks/useAuth";
import { RateLimitError } from "@/services";

export function SignupForm() {
  const navigate = useNavigate();
  const signup = useSignup();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [awaitingVerification, setAwaitingVerification] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
  }>({});

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    signup.reset();
    const result = signupInputSchema.safeParse({ name, email, password });
    if (!result.success) {
      const next: typeof fieldErrors = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0];
        if ((field === "name" || field === "email" || field === "password") && !next[field]) {
          next[field] = issue.message;
        }
      });
      setFieldErrors(next);
      return;
    }
    setFieldErrors({});
    try {
      const session = await signup.mutateAsync(result.data);
      if (session) navigate({ to: "/chat" });
      else setAwaitingVerification(true);
    } catch {
      /* handled via signup.error */
    }
  }

  const strength = password.length === 0 ? "" : password.length < 8 ? "Too short" : "Looks good";

  if (awaitingVerification) {
    return (
      <div className="space-y-4 text-sm">
        <p>
          Check your email for a verification link. For privacy, this message is the same whether
          the address is new or already registered.
        </p>
        <Link to="/login" className="text-primary hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  const errorMessage =
    signup.error instanceof RateLimitError
      ? signup.error.message
      : "Couldn't create your account. Try again.";

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {signup.error && (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          required
          disabled={signup.isPending}
          aria-invalid={Boolean(fieldErrors.name)}
          aria-describedby={fieldErrors.name ? "name-error" : undefined}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setFieldErrors((current) => ({ ...current, name: undefined }));
          }}
          placeholder="Ada Lovelace"
        />
        {fieldErrors.name && (
          <p id="name-error" className="text-xs text-destructive">
            {fieldErrors.name}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          disabled={signup.isPending}
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
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            minLength={8}
            disabled={signup.isPending}
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
            disabled={signup.isPending}
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
        {strength && <p className="text-xs text-muted-foreground">{strength}</p>}
      </div>

      <Button type="submit" className="w-full" disabled={signup.isPending}>
        {signup.isPending ? <LoadingSpinner className="mr-2" /> : null}
        Create account
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
