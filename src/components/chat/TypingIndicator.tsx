import { Logo } from "@/components/common/Logo";

export function TypingIndicator() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex animate-in items-start gap-3 py-4 fade-in-0 slide-in-from-bottom-1"
    >
      <div className="animate-pulse motion-reduce:animate-none">
        <Logo showText={false} size={28} />
      </div>
      <div className="rounded-2xl border border-border/60 bg-muted/40 px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2 w-2" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-50 motion-reduce:animate-none" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          <span className="text-sm font-medium">Aster is thinking</span>
          <span className="flex items-center gap-1" aria-hidden="true">
            <span className="h-1 w-1 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s] motion-reduce:animate-none" />
            <span className="h-1 w-1 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s] motion-reduce:animate-none" />
            <span className="h-1 w-1 animate-bounce rounded-full bg-muted-foreground motion-reduce:animate-none" />
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Generating a response…</p>
      </div>
    </div>
  );
}
