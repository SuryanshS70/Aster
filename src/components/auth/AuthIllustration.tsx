// Decorative coral panel with an organic blob edge for the auth split-screen.
// Uses semantic tokens only.

export function AuthIllustration() {
  return (
    <div className="relative hidden h-full w-full overflow-hidden bg-coral text-coral-foreground lg:block">
      {/* Organic blob edge that bleeds from the left column */}
      <svg
        aria-hidden
        className="absolute inset-y-0 -left-24 h-full w-40 text-background"
        viewBox="0 0 200 800"
        preserveAspectRatio="none"
      >
        <path
          fill="currentColor"
          d="M0 0h140c-20 100 40 180 20 300s-60 180-30 300 40 140 10 200H0z"
        />
      </svg>

      <div className="relative z-10 flex h-full flex-col items-center justify-center p-12">
        <div className="max-w-md space-y-6 text-center">
          <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-full bg-coral-foreground/10 backdrop-blur">
            <svg viewBox="0 0 24 24" className="h-16 w-16" fill="currentColor">
              <path d="M12 2l2.2 6.8H21l-5.4 4 2 6.8L12 15.6 6.4 19.6l2-6.8L3 8.8h6.8L12 2z" />
            </svg>
          </div>
          <div className="space-y-3">
            <p className="font-serif text-3xl leading-tight">
              A calmer way to think with AI.
            </p>
            <p className="text-sm opacity-80">
              Private conversations, thoughtful answers, and a clean space to focus.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
