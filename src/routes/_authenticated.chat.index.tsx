import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChatShell } from "@/components/chat/ChatShell";
import { EmptyChat } from "@/components/chat/EmptyChat";
import { useConversations, useCreateConversation } from "@/hooks/useConversations";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

export const Route = createFileRoute("/_authenticated/chat/")({
  component: ChatIndex,
});

function ChatIndex() {
  const navigate = useNavigate();
  const conversations = useConversations();
  const create = useCreateConversation();

  useEffect(() => {
    if (!conversations.data) return;
    const first = conversations.data[0];
    if (first) {
      navigate({
        to: "/chat/$conversationId",
        params: { conversationId: first.id },
        replace: true,
      });
    }
  }, [conversations.data, navigate]);

  async function startFrom(prompt: string) {
    const conv = await create.mutateAsync({ title: prompt.slice(0, 60) });
    navigate({
      to: "/chat/$conversationId",
      params: { conversationId: conv.id },
      search: { initial: prompt },
    });
  }

  return (
    <ChatShell title="New chat">
      {conversations.isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <LoadingSpinner className="h-6 w-6" />
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <EmptyChat onSuggest={startFrom} />
        </div>
      )}
    </ChatShell>
  );
}
