import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { authService } from "@/services";
import { queryKeys } from "./queryKeys";

export function useSession() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.session,
    queryFn: () => authService.getCurrentUser(),
    staleTime: 30_000,
    retry: false,
  });

  useEffect(() => {
    return authService.onAuthChange((s) => {
      qc.setQueryData(queryKeys.session, s);
    });
  }, [qc]);

  return query;
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: authService.login,
    onSuccess: (session) => qc.setQueryData(queryKeys.session, session),
  });
}

export function useSignup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: authService.signup,
    onSuccess: (session) => qc.setQueryData(queryKeys.session, session),
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      qc.clear();
      qc.setQueryData(queryKeys.session, null);
    },
  });
}

export function useRequestPasswordReset() {
  return useMutation({ mutationFn: authService.requestPasswordReset });
}

export function useResetPassword() {
  return useMutation({ mutationFn: authService.resetPassword });
}
