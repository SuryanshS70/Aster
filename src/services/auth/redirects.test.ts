import { describe, expect, it } from "vitest";

import { getAllowedAuthRedirect, getAuthRedirect } from "./redirects";

describe("authentication redirects", () => {
  it("preserves only allowlisted protected-route destinations", () => {
    expect(getAllowedAuthRedirect("/chat")).toBe("/chat");
    expect(getAllowedAuthRedirect("/settings")).toBe("/settings");
  });

  it("rejects external, protocol-relative, and unlisted destinations", () => {
    expect(getAllowedAuthRedirect("https://evil.test")).toBeUndefined();
    expect(getAllowedAuthRedirect("//evil.test")).toBeUndefined();
    expect(getAllowedAuthRedirect("/forgot-password")).toBeUndefined();
    expect(getAuthRedirect("https://evil.test")).toBe("/chat");
  });
});
