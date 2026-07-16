import { useEffect, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/common/ErrorState";
import { EmptyChat } from "./EmptyChat";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { useMessages } from "@/hooks/useMessages";
import type { Message } from "@/services";

type Props = {
  conversationId: string;
  streamingText: string;
  state: "idle" | "sending" | "streaming" | "error";
  onSuggest: (prompt: string) => void;
  onRegenerate?: () => void;
};

export function MessageList({ conversationId, streamingText, state, onSuggest, onRegenerate }: Props) {
  const { data, isLoading, isError, refetch } = useMessages(conversationId);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [data, streamingText, state]);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-16 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-md p-8">
        <ErrorState onRetry={() => refetch()} />
      </div>
    );
  }

  const messages = data ?? [];

  if (messages.length === 0 && state === "idle") {
    return <EmptyChat onSuggest={onSuggest} />;
  }

  const streamingBubble: Message | null =
    state === "streaming" && streamingText
      ? {
          id: "streaming",
          conversationId,
          role: "assistant",
          content: streamingText,
          createdAt: new Date().toISOString(),
          status: "streaming",
        }
      : null;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      {messages.map((m, i) => {
        const isLastAssistant =
          m.role === "assistant" && i === messages.length - 1 && state === "idle";
        return (
          <MessageBubble
            key={m.id}
            message={m}
            onRegenerate={isLastAssistant ? onRegenerate : undefined}
          />
        );
      })}
      {state === "sending" && <TypingIndicator />}
      {streamingBubble && <MessageBubble message={streamingBubble} streaming />}
      <div ref={bottomRef} />
    </div>
  );
}
