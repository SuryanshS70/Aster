import type {
  CreateProjectInput,
  Project,
  ProjectDocument,
  UpdateProjectInput,
} from "@/contracts/projects";

export type {
  CreateProjectInput,
  Project,
  ProjectDocument,
  UpdateProjectInput,
} from "@/contracts/projects";

export interface ProjectService {
  getProjects(): Promise<Project[]>;
  createProject(input: CreateProjectInput): Promise<Project>;
  getProject(id: string): Promise<Project>;
  updateProject(id: string, input: UpdateProjectInput): Promise<Project>;
  deleteProject(id: string): Promise<void>;
  getDocuments(projectId: string): Promise<ProjectDocument[]>;
  uploadDocument(projectId: string, file: File): Promise<ProjectDocument>;
  deleteDocument(projectId: string, documentId: string): Promise<void>;
}
