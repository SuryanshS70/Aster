import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChatShell } from "@/components/chat/ChatShell";
import { MessageList } from "@/components/chat/MessageList";
import { Composer } from "@/components/chat/Composer";
import { useConversations } from "@/hooks/useConversations";
import { useSendMessage } from "@/hooks/useMessages";

type Search = { initial?: string };

export const Route = createFileRoute("/_authenticated/chat/$conversationId")({
  validateSearch: (raw): Search => ({
    initial: typeof raw.initial === "string" ? raw.initial : undefined,
  }),
  component: ChatConversationPage,
});

function ChatConversationPage() {
  const { conversationId } = Route.useParams();
  const { initial } = Route.useSearch();
  const navigate = useNavigate();
  const conversations = useConversations();
  const conv = conversations.data?.find((c) => c.id === conversationId);
  const { send, stop, regenerate, streamingText, state } = useSendMessage(conversationId);

  // If an initial prompt was passed via search (from EmptyChat), fire it once.
  useEffect(() => {
    if (initial) {
      void send(initial);
      navigate({
        to: "/chat/$conversationId",
        params: { conversationId },
        search: {},
        replace: true,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  const isBusy = state === "sending" || state === "streaming";

  return (
    <ChatShell title={conv?.title ?? "Chat"}>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <MessageList
          key={conversationId}
          conversationId={conversationId}
          streamingText={streamingText}
          state={state}
          onSuggest={(prompt) => void send(prompt)}
          onRegenerate={() => void regenerate()}
        />
      </div>
      <Composer
        onSend={(t) => void send(t)}
        onStop={stop}
        disabled={isBusy}
        streaming={isBusy}
        autoFocusKey={conversationId}
      />
    </ChatShell>
  );
}
