export const queryKeys = {
  session: ["session"] as const,
  conversations: ["conversations"] as const,
  conversation: (id: string) => ["conversation", id] as const,
  messages: (conversationId: string) => ["messages", conversationId] as const,
  modelPreference: ["model-preference"] as const,
  projects: ["projects"] as const,
  project: (id: string) => ["project", id] as const,
  projectDocuments: (projectId: string) => ["project-documents", projectId] as const,
};
