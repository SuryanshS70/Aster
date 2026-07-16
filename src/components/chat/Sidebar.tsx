import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { Plus, Trash2, LogOut, MessageSquare, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Logo } from "@/components/common/Logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import {
  useConversations,
  useCreateConversation,
  useDeleteConversation,
  useRenameConversation,
} from "@/hooks/useConversations";
import { useLogout, useSession } from "@/hooks/useAuth";
import type { Conversation } from "@/services";
import { cn } from "@/lib/utils";

function groupByDate(items: Conversation[]) {
  const today: Conversation[] = [];
  const yesterday: Conversation[] = [];
  const older: Conversation[] = [];
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startYesterday = startToday - 1000 * 60 * 60 * 24;
  for (const c of items) {
    const t = new Date(c.updatedAt).getTime();
    if (t >= startToday) today.push(c);
    else if (t >= startYesterday) yesterday.push(c);
    else older.push(c);
  }
  return { today, yesterday, older };
}

type Props = { onNavigate?: () => void };

export function Sidebar({ onNavigate }: Props) {
  const navigate = useNavigate();
  const { data: session } = useSession();
  const logout = useLogout();
  const conversations = useConversations();
  const create = useCreateConversation();
  const remove = useDeleteConversation();
  const rename = useRenameConversation();
  const params = useParams({ strict: false }) as { conversationId?: string };

  async function handleNew() {
    const conv = await create.mutateAsync(undefined);
    onNavigate?.();
    navigate({ to: "/chat/$conversationId", params: { conversationId: conv.id } });
  }

  async function handleDelete(id: string, title: string) {
    if (typeof window !== "undefined" && !window.confirm(`Delete "${title}"?`)) return;
    await remove.mutateAsync(id);
    if (params.conversationId === id) navigate({ to: "/chat" });
  }

  async function handleRename(id: string, current: string) {
    if (typeof window === "undefined") return;
    const next = window.prompt("Rename conversation", current);
    if (!next || next.trim() === "" || next === current) return;
    await rename.mutateAsync({ id, title: next.trim() });
  }

  const groups = conversations.data ? groupByDate(conversations.data) : null;

  return (
    <aside className="flex h-full w-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center justify-between p-4">
        <Logo />
      </div>

      <div className="px-3">
        <Button
          className="w-full justify-start gap-2"
          onClick={handleNew}
          disabled={create.isPending}
        >
          <Plus className="h-4 w-4" />
          New chat
        </Button>
      </div>

      <ScrollArea className="mt-4 flex-1 px-2">
        {conversations.isLoading && (
          <div className="space-y-2 p-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        )}

        {conversations.isError && (
          <div className="p-2">
            <ErrorState
              title="Couldn't load chats"
              onRetry={() => conversations.refetch()}
            />
          </div>
        )}

        {groups && conversations.data!.length === 0 && (
          <EmptyState
            icon={<MessageSquare className="h-5 w-5" />}
            title="No conversations yet"
            description="Start a new chat to begin."
          />
        )}

        {groups && (
          <div className="space-y-4 pb-6">
            <Group
              label="Today"
              items={groups.today}
              activeId={params.conversationId}
              onDelete={handleDelete}
              onRename={handleRename}
              onNavigate={onNavigate}
            />
            <Group
              label="Yesterday"
              items={groups.yesterday}
              activeId={params.conversationId}
              onDelete={handleDelete}
              onRename={handleRename}
              onNavigate={onNavigate}
            />
            <Group
              label="Earlier"
              items={groups.older}
              activeId={params.conversationId}
              onDelete={handleDelete}
              onRename={handleRename}
              onNavigate={onNavigate}
            />

          </div>
        )}
      </ScrollArea>

      <div className="border-t p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-sidebar-accent">
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  {session?.user.name?.slice(0, 1).toUpperCase() ?? "?"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {session?.user.name ?? "Guest"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {session?.user.email ?? ""}
                </p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem asChild>
              <Link to="/settings">Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                logout.mutate(undefined, {
                  onSuccess: () => navigate({ to: "/login" }),
                });
              }}
            >
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}

function Group({
  label,
  items,
  activeId,
  onDelete,
  onRename,
  onNavigate,
}: {
  label: string;
  items: Conversation[];
  activeId?: string;
  onDelete: (id: string, title: string) => void;
  onRename: (id: string, title: string) => void;
  onNavigate?: () => void;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="px-2 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <ul className="space-y-0.5">
        {items.map((c) => {
          const active = c.id === activeId;
          return (
            <li key={c.id} className="group relative">
              <Link
                to="/chat/$conversationId"
                params={{ conversationId: c.id }}
                onClick={onNavigate}
                className={cn(
                  "block truncate rounded-lg px-2 py-2 pr-14 text-sm hover:bg-sidebar-accent",
                  active && "bg-sidebar-accent font-medium",
                )}
              >
                {c.title}
              </Link>
              <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center gap-0.5 opacity-0 focus-within:opacity-100 group-hover:opacity-100">
                <button
                  onClick={() => onRename(c.id, c.title)}
                  aria-label="Rename conversation"
                  className="rounded p-1 text-muted-foreground hover:bg-background hover:text-foreground"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => onDelete(c.id, c.title)}
                  aria-label="Delete conversation"
                  className="rounded p-1 text-muted-foreground hover:bg-background hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
