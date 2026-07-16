import type { AuthService } from "./auth.types";
import { mockAuthService } from "./mock-auth.service";

// Swap this export with a real HTTP-backed implementation when the
// backend is ready. Components/hooks import only `authService`.
export const authService: AuthService = mockAuthService;
