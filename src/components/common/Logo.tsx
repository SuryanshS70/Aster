import { cn } from "@/lib/utils";

type Props = { className?: string; showText?: boolean; size?: number };

export function Logo({ className, showText = true, size = 22 }: Props) {
  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <span
        aria-hidden
        className="inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground"
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 24 24" width={size * 0.7} height={size * 0.7} fill="currentColor">
          <path d="M12 2l2.2 6.8H21l-5.4 4 2 6.8L12 15.6 6.4 19.6l2-6.8L3 8.8h6.8L12 2z" />
        </svg>
      </span>
      {showText && <span className="font-serif text-xl leading-none tracking-tight">Aster</span>}
    </div>
  );
}
