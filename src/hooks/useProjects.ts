import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { CreateProjectInput, UpdateProjectInput } from "@/contracts/projects";
import { projectService } from "@/services";
import { queryKeys } from "./queryKeys";

export function useProjects() {
  return useQuery({
    queryKey: queryKeys.projects,
    queryFn: () => projectService.getProjects(),
  });
}

export function useProject(projectId: string | undefined) {
  return useQuery({
    queryKey: projectId ? queryKeys.project(projectId) : ["project", "none"],
    queryFn: () => projectService.getProject(projectId!),
    enabled: Boolean(projectId),
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProjectInput) => projectService.createProject(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.projects }),
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateProjectInput }) =>
      projectService.updateProject(id, input),
    onSuccess: (project) => {
      queryClient.setQueryData(queryKeys.project(project.id), project);
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (projectId: string) => projectService.deleteProject(projectId),
    onSuccess: (_, projectId) => {
      queryClient.removeQueries({ queryKey: queryKeys.project(projectId) });
      queryClient.removeQueries({ queryKey: queryKeys.projectDocuments(projectId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects });
      void queryClient.invalidateQueries({ queryKey: queryKeys.conversations });
    },
  });
}

export function useProjectDocuments(projectId: string | undefined) {
  return useQuery({
    queryKey: projectId ? queryKeys.projectDocuments(projectId) : ["project-documents", "none"],
    queryFn: () => projectService.getDocuments(projectId!),
    enabled: Boolean(projectId),
  });
}

export function useUploadProjectDocument(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => projectService.uploadDocument(projectId, file),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projectDocuments(projectId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects });
    },
  });
}

export function useDeleteProjectDocument(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (documentId: string) => projectService.deleteDocument(projectId, documentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projectDocuments(projectId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects });
    },
  });
}
