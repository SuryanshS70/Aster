import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { conversationService } from "@/services";
import { queryKeys } from "./queryKeys";

export function useConversations() {
  return useQuery({
    queryKey: queryKeys.conversations,
    queryFn: () => conversationService.getConversations(),
  });
}

export function useCreateConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (title?: string) => conversationService.createConversation({ title }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.conversations }),
  });
}

export function useRenameConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      conversationService.renameConversation(id, title),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.conversations }),
  });
}

export function useDeleteConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => conversationService.deleteConversation(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.conversations }),
  });
}
