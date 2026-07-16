import { useState } from "react";
import { Copy, Check, RotateCcw } from "lucide-react";
import type { Message } from "@/services";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/common/Logo";

type Props = {
  message: Message;
  streaming?: boolean;
  onRegenerate?: () => void;
};

export function MessageBubble({ message, streaming, onRegenerate }: Props) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  async function copy() {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className={cn("group flex w-full gap-3 py-4", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="mt-0.5 shrink-0">
          <Logo showText={false} size={28} />
        </div>
      )}
      <div className={cn("flex max-w-[85%] flex-col gap-1", isUser && "items-end")}>
        <div
          className={cn(
            "whitespace-pre-wrap break-words rounded-2xl text-sm leading-relaxed",
            isUser ? "bg-primary px-4 py-2.5 text-primary-foreground" : "text-foreground",
          )}
        >
          {message.content}
          {streaming && (
            <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-current align-middle" />
          )}
        </div>
        {!isUser && message.content && !streaming && (
          <div className="mt-0.5 flex items-center gap-3 opacity-0 transition group-hover:opacity-100">
            <button
              onClick={copy}
              className="flex items-center gap-1 text-xs text-muted-foreground transition hover:text-foreground"
              aria-label="Copy message"
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? "Copied" : "Copy"}
            </button>
            {onRegenerate && (
              <button
                onClick={onRegenerate}
                className="flex items-center gap-1 text-xs text-muted-foreground transition hover:text-foreground"
                aria-label="Regenerate response"
              >
                <RotateCcw className="h-3 w-3" />
                Regenerate
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
