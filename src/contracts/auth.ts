import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "Email must be 254 characters or fewer")
  .email("Enter a valid email address");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be 128 characters or fewer");

export const loginInputSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
  })
  .strict();

export const signupInputSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(100),
    email: emailSchema,
    password: passwordSchema,
  })
  .strict();

export const passwordResetRequestSchema = z
  .object({
    email: emailSchema,
  })
  .strict();

export const resetPasswordInputSchema = z
  .object({
    token: z.string().trim().min(1, "Reset token is required").max(2048),
    password: passwordSchema,
  })
  .strict();

export type LoginInput = z.infer<typeof loginInputSchema>;
export type SignupInput = z.infer<typeof signupInputSchema>;
export type PasswordResetRequest = z.infer<typeof passwordResetRequestSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordInputSchema>;
