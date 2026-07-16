import { Logo } from "@/components/common/Logo";
import { Button } from "@/components/ui/button";

const SUGGESTIONS = [
  "Help me plan a focused work week",
  "Draft a friendly follow-up email",
  "Explain a concept like I'm five",
  "Brainstorm ideas for a weekend project",
];

export function EmptyChat({ onSuggest }: { onSuggest: (prompt: string) => void }) {
  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center px-4 py-16 text-center">
      <Logo showText={false} size={56} />
      <h2 className="mt-6 font-serif text-3xl sm:text-4xl">How can I help today?</h2>
      <p className="mt-2 text-muted-foreground">
        Ask a question, or start from one of these ideas.
      </p>
      <div className="mt-8 grid w-full gap-2 sm:grid-cols-2">
        {SUGGESTIONS.map((s) => (
          <Button
            key={s}
            variant="outline"
            className="h-auto justify-start whitespace-normal rounded-xl px-4 py-3 text-left text-sm font-normal"
            onClick={() => onSuggest(s)}
          >
            {s}
          </Button>
        ))}
      </div>
    </div>
  );
}
