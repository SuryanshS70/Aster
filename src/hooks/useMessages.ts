import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { chatService } from "@/services";
import type { Message } from "@/services";
import { queryKeys } from "./queryKeys";

export function useMessages(conversationId: string | undefined) {
  return useQuery({
    queryKey: conversationId ? queryKeys.messages(conversationId) : ["messages", "none"],
    queryFn: () => chatService.getMessages(conversationId!),
    enabled: !!conversationId,
  });
}

type StreamState = "idle" | "sending" | "streaming" | "error";

export function useSendMessage(conversationId: string | undefined) {
  const qc = useQueryClient();
  const [streamingText, setStreamingText] = useState("");
  const [state, setState] = useState<StreamState>("idle");

  const consumeStream = useCallback(
    async (stream: AsyncIterable<{ delta: string } | { done: true }>) => {
      if (!conversationId) return;
      try {
        setState("streaming");
        let acc = "";
        for await (const chunk of stream) {
          if ("delta" in chunk) {
            acc += chunk.delta;
            setStreamingText(acc);
          }
        }
        setStreamingText("");
        setState("idle");
        await qc.invalidateQueries({ queryKey: queryKeys.messages(conversationId) });
        await qc.invalidateQueries({ queryKey: queryKeys.conversations });
      } catch (err) {
        console.error(err);
        setState("error");
        setStreamingText("");
      }
    },
    [conversationId, qc],
  );

  const send = useCallback(
    async (content: string) => {
      if (!conversationId || state === "sending" || state === "streaming") return;
      setState("sending");
      setStreamingText("");

      const optimisticUser: Message = {
        id: `optimistic_${Date.now()}`,
        conversationId,
        role: "user",
        content,
        createdAt: new Date().toISOString(),
        status: "complete",
      };
      qc.setQueryData<Message[]>(queryKeys.messages(conversationId), (prev = []) => [
        ...prev,
        optimisticUser,
      ]);

      await consumeStream(chatService.sendMessage({ conversationId, content }));
    },
    [conversationId, qc, state, consumeStream],
  );

  const regenerate = useCallback(async () => {
    if (!conversationId || state === "sending" || state === "streaming") return;
    setState("sending");
    setStreamingText("");
    await consumeStream(chatService.regenerateResponse(conversationId));
  }, [conversationId, state, consumeStream]);

  const stop = useCallback(() => {
    if (conversationId) void chatService.stopGeneration(conversationId);
  }, [conversationId]);

  return { send, stop, regenerate, streamingText, state };
}
