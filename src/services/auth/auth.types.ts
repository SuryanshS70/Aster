import type { LoginInput, ResetPasswordInput, SignupInput } from "@/contracts/auth";

export type { LoginInput, ResetPasswordInput, SignupInput } from "@/contracts/auth";

export type User = {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
};

export type Session = {
  user: User;
  expiresAt: string;
};

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class RateLimitError extends Error {
  constructor(message = "Rate limit exceeded") {
    super(message);
    this.name = "RateLimitError";
  }
}

export type AuthChangeListener = (session: Session | null) => void;

export interface AuthService {
  getCurrentUser(): Promise<Session | null>;
  login(input: LoginInput): Promise<Session>;
  signup(input: SignupInput): Promise<Session>;
  logout(): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  resetPassword(input: ResetPasswordInput): Promise<void>;
  onAuthChange(cb: AuthChangeListener): () => void;
}
