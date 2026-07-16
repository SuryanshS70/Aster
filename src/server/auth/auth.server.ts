import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";

import { getServerEnv, getTrustedOrigins } from "../config/env.server";
import { getDatabase } from "../db/client.server";
import * as schema from "../db/schema";
import { queueAuthEmail } from "./email.server";
import { createAuthRateLimitStorage } from "./rate-limit.server";

const env = getServerEnv();

export const auth = betterAuth({
  appName: "Aster",
  baseURL: env.BETTER_AUTH_URL,
  basePath: "/api/auth",
  secret: env.SESSION_SECRET,
  database: drizzleAdapter(getDatabase(), {
    provider: "pg",
    schema,
  }),
  trustedOrigins: getTrustedOrigins(env),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      queueAuthEmail({
        to: user.email,
        subject: "Reset your Aster password",
        text: `Reset your password: ${url}`,
        html: `<p>Reset your Aster password:</p><p><a href="${url}">Reset password</a></p>`,
      });
      await Promise.resolve();
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      queueAuthEmail({
        to: user.email,
        subject: "Verify your Aster email",
        text: `Verify your email: ${url}`,
        html: `<p>Verify your Aster email address:</p><p><a href="${url}">Verify email</a></p>`,
      });
      await Promise.resolve();
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    freshAge: 60 * 5,
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 60,
    customStorage: createAuthRateLimitStorage(),
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60, max: 5 },
      "/request-password-reset": { window: 60, max: 3 },
      "/reset-password": { window: 60, max: 5 },
      "/send-verification-email": { window: 60, max: 3 },
    },
  },
  advanced: {
    cookiePrefix: "aster",
    useSecureCookies: env.NODE_ENV === "production",
    defaultCookieAttributes: {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    },
  },
  plugins: [tanstackStartCookies()],
});
