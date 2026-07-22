import {
  createProjectInputSchema,
  projectDocumentIdSchema,
  projectDocumentListSchema,
  projectDocumentSchema,
  projectIdSchema,
  projectListSchema,
  projectSchema,
  updateProjectInputSchema,
} from "@/contracts/projects";
import type { ProjectService } from "./project.types";

async function request(path: string, init?: RequestInit): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(path, { ...init, credentials: "same-origin" });
  } catch {
    throw new Error("Projects are temporarily unavailable. Please try again.");
  }
  if (!response.ok) {
    throw new Error(
      response.status === 413
        ? "The document is too large."
        : "Unable to update this project. Please try again.",
    );
  }
  return response.status === 204 ? undefined : response.json();
}

export const projectService: ProjectService = {
  async getProjects() {
    return projectListSchema.parse(await request("/api/projects"));
  },

  async createProject(input) {
    const validated = createProjectInputSchema.parse(input);
    return projectSchema.parse(
      await request("/api/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(validated),
      }),
    );
  },

  async getProject(id) {
    const projectId = projectIdSchema.parse(id);
    return projectSchema.parse(await request("/api/projects/" + encodeURIComponent(projectId)));
  },

  async updateProject(id, input) {
    const projectId = projectIdSchema.parse(id);
    const validated = updateProjectInputSchema.parse(input);
    return projectSchema.parse(
      await request("/api/projects/" + encodeURIComponent(projectId), {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(validated),
      }),
    );
  },

  async deleteProject(id) {
    const projectId = projectIdSchema.parse(id);
    await request("/api/projects/" + encodeURIComponent(projectId), { method: "DELETE" });
  },

  async getDocuments(id) {
    const projectId = projectIdSchema.parse(id);
    return projectDocumentListSchema.parse(
      await request("/api/projects/" + encodeURIComponent(projectId) + "/documents"),
    );
  },

  async uploadDocument(id, file) {
    const projectId = projectIdSchema.parse(id);
    const form = new FormData();
    form.set("file", file);
    return projectDocumentSchema.parse(
      await request("/api/projects/" + encodeURIComponent(projectId) + "/documents", {
        method: "POST",
        body: form,
      }),
    );
  },

  async deleteDocument(id, rawDocumentId) {
    const projectId = projectIdSchema.parse(id);
    const documentId = projectDocumentIdSchema.parse(rawDocumentId);
    await request(
      "/api/projects/" +
        encodeURIComponent(projectId) +
        "/documents/" +
        encodeURIComponent(documentId),
      { method: "DELETE" },
    );
  },
};
