import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { GeminiModel } from "@/contracts";
import { modelPreferenceService } from "@/services";
import { queryKeys } from "./queryKeys";

export function useModelPreference() {
  return useQuery({
    queryKey: queryKeys.modelPreference,
    queryFn: () => modelPreferenceService.get(),
  });
}

export function useUpdateModelPreference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (model: GeminiModel) => modelPreferenceService.update(model),
    onSuccess: (preference) => {
      queryClient.setQueryData(queryKeys.modelPreference, preference);
    },
  });
}
