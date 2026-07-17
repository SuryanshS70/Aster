export const authenticatedRedirects = ["/chat", "/settings"] as const;

export type AuthenticatedRedirect = (typeof authenticatedRedirects)[number];

export function getAllowedAuthRedirect(value: unknown): AuthenticatedRedirect | undefined {
  return authenticatedRedirects.find((route) => route === value);
}

export function getAuthRedirect(value: unknown): AuthenticatedRedirect {
  return getAllowedAuthRedirect(value) ?? "/chat";
}
