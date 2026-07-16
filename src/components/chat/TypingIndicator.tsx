import { Logo } from "@/components/common/Logo";

export function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 py-4">
      <Logo showText={false} size={28} />
      <div className="flex items-center gap-1 pt-2.5">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
      </div>
    </div>
  );
}
