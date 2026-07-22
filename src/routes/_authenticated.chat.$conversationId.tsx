import { useEffect } from "react";
import { FolderOpen } from "lucide-react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChatShell } from "@/components/chat/ChatShell";
import { MessageList } from "@/components/chat/MessageList";
import { Composer } from "@/components/chat/Composer";
import { useConversations } from "@/hooks/useConversations";
import { useSendMessage } from "@/hooks/useMessages";
import { useProject } from "@/hooks/useProjects";

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
  const project = useProject(conv?.projectId ?? undefined);
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
      {conv?.projectId && (
        <Link
          to="/projects/$projectId"
          params={{ projectId: conv.projectId }}
          className="flex items-center gap-2 border-b bg-primary/5 px-4 py-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <FolderOpen className="h-3.5 w-3.5 text-primary" />
          <span>
            Using project knowledge: <strong>{project.data?.name ?? "Project"}</strong>
          </span>
        </Link>
      )}
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
