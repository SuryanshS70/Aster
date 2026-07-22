import { useState } from "react";
import { Copy, Check, RotateCcw } from "lucide-react";
import ReactMarkdown from "react-markdown";
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
            "break-words rounded-2xl text-sm leading-relaxed",
            isUser
              ? "whitespace-pre-wrap bg-primary px-4 py-2.5 text-primary-foreground"
              : "min-w-0 text-foreground",
          )}
        >
          {isUser ? (
            message.content
          ) : (
            <ReactMarkdown
              components={{
                h1: ({ children }) => (
                  <h1 className="mb-3 mt-6 text-xl font-semibold first:mt-0">{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 className="mb-3 mt-6 text-lg font-semibold first:mt-0">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="mb-2 mt-5 text-base font-semibold first:mt-0">{children}</h3>
                ),
                p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                ul: ({ children }) => (
                  <ul className="mb-3 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="mb-3 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>
                ),
                li: ({ children }) => <li className="pl-1">{children}</li>,
                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                blockquote: ({ children }) => (
                  <blockquote className="my-3 border-l-2 border-primary/40 pl-4 text-muted-foreground">
                    {children}
                  </blockquote>
                ),
                pre: ({ children }) => (
                  <pre className="my-3 overflow-x-auto rounded-xl bg-muted p-4 text-xs leading-relaxed [&_code]:bg-transparent [&_code]:p-0">
                    {children}
                  </pre>
                ),
                code: ({ children }) => (
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.875em]">
                    {children}
                  </code>
                ),
                a: ({ children, href }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
                  >
                    {children}
                  </a>
                ),
                hr: () => <hr className="my-5 border-border" />,
              }}
            >
              {message.content}
            </ReactMarkdown>
          )}
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
