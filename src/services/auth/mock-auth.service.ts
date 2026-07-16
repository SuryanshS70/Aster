import { mockDelay, mockId } from "@/mocks/mock-data";
import type {
  AuthChangeListener,
  AuthService,
  LoginInput,
  ResetPasswordInput,
  Session,
  SignupInput,
} from "./auth.types";
import { UnauthorizedError } from "./auth.types";

const STORAGE_KEY = "aster.session.v1";

const listeners = new Set<AuthChangeListener>();

function read(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Session;
    if (new Date(parsed.expiresAt).getTime() < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

function write(session: Session | null) {
  if (typeof window === "undefined") return;
  if (session) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  else window.localStorage.removeItem(STORAGE_KEY);
  listeners.forEach((cb) => cb(session));
}

function makeSession(email: string, name: string): Session {
  return {
    user: { id: mockId("user"), email, name },
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
  };
}

export const mockAuthService: AuthService = {
  async getCurrentUser() {
    await mockDelay(50, 150);
    return read();
  },

  async login({ email, password }: LoginInput) {
    await mockDelay();
    if (!email || !password) throw new UnauthorizedError("Invalid credentials");
    const name = email.split("@")[0].replace(/[._-]/g, " ");
    const session = makeSession(email, name);
    write(session);
    return session;
  },

  async signup({ name, email, password }: SignupInput) {
    await mockDelay();
    if (!email || !password || !name) throw new Error("Missing fields");
    const session = makeSession(email, name);
    write(session);
    return session;
  },

  async logout() {
    await mockDelay(100, 200);
    write(null);
  },

  async requestPasswordReset(email: string) {
    await mockDelay();
    if (!email) throw new Error("Email required");
  },

  async resetPassword({ token, password }: ResetPasswordInput) {
    await mockDelay();
    if (!token || !password) throw new Error("Missing fields");
  },

  onAuthChange(cb: AuthChangeListener) {
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  },
};
