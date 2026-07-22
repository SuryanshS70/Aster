import { useState, type FormEvent } from "react";
import { FolderOpen, Pencil, Plus, Trash2 } from "lucide-react";
import { Link, createFileRoute } from "@tanstack/react-router";

import { ChatShell } from "@/components/chat/ChatShell";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createProjectInputSchema } from "@/contracts/projects";
import {
  useCreateProject,
  useDeleteProject,
  useProjects,
  useUpdateProject,
} from "@/hooks/useProjects";

export const Route = createFileRoute("/_authenticated/projects/")({
  component: ProjectsPage,
});

function ProjectsPage() {
  const projects = useProjects();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setFeedback(null);
    const parsed = createProjectInputSchema.safeParse({
      name,
      ...(description.trim() ? { description } : {}),
    });
    if (!parsed.success) {
      setFeedback(parsed.error.issues[0]?.message ?? "Check the project details.");
      return;
    }
    try {
      await createProject.mutateAsync(parsed.data);
      setName("");
      setDescription("");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Couldn't create the project.");
    }
  }

  async function handleRename(id: string, currentName: string) {
    if (typeof window === "undefined") return;
    const next = window.prompt("Rename project", currentName)?.trim();
    if (!next || next === currentName) return;
    setFeedback(null);
    try {
      await updateProject.mutateAsync({ id, input: { name: next } });
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Couldn't rename the project.");
    }
  }

  async function handleDelete(id: string, projectName: string) {
    if (
      typeof window !== "undefined" &&
      !window.confirm('Delete "' + projectName + '" and all of its chats and documents?')
    ) {
      return;
    }
    setFeedback(null);
    try {
      await deleteProject.mutateAsync(id);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Couldn't delete the project.");
    }
  }

  return (
    <ChatShell title="Projects">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <main className="mx-auto w-full max-w-4xl space-y-8 p-6 pb-12">
          <div>
            <h2 className="font-serif text-3xl">Projects</h2>
            <p className="mt-1 text-muted-foreground">
              Group documents and chats around one topic.
            </p>
          </div>

          <form onSubmit={handleCreate} className="rounded-2xl border bg-card p-5">
            <h3 className="font-medium">Create a project</h3>
            <div className="mt-4 grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="project-name">Name</Label>
                <Input
                  id="project-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={80}
                  disabled={createProject.isPending}
                  placeholder="Research notes"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-description">Description (optional)</Label>
                <Textarea
                  id="project-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  maxLength={500}
                  disabled={createProject.isPending}
                  placeholder="What this project is about"
                />
              </div>
            </div>
            {feedback && <p className="mt-3 text-sm text-destructive">{feedback}</p>}
            <Button className="mt-4 gap-2" type="submit" disabled={createProject.isPending}>
              {createProject.isPending ? (
                <LoadingSpinner className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Create project
            </Button>
          </form>

          {projects.isLoading && (
            <div className="flex justify-center py-12">
              <LoadingSpinner className="h-6 w-6" />
            </div>
          )}
          {projects.isError && (
            <ErrorState title="Couldn't load projects" onRetry={() => projects.refetch()} />
          )}
          {projects.data?.length === 0 && (
            <EmptyState
              icon={<FolderOpen className="h-6 w-6" />}
              title="No projects yet"
              description="Create one to start chatting with your documents."
            />
          )}
          {projects.data && projects.data.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {projects.data.map((project) => (
                <article key={project.id} className="rounded-2xl border bg-card p-5">
                  <Link
                    to="/projects/$projectId"
                    params={{ projectId: project.id }}
                    className="block rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <div className="flex items-center gap-3">
                      <span className="rounded-xl bg-primary/10 p-2 text-primary">
                        <FolderOpen className="h-5 w-5" />
                      </span>
                      <h3 className="truncate font-medium">{project.name}</h3>
                    </div>
                    <p className="mt-3 line-clamp-2 min-h-10 text-sm text-muted-foreground">
                      {project.description || "No description"}
                    </p>
                  </Link>
                  <div className="mt-4 flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleRename(project.id, project.name)}
                      disabled={updateProject.isPending || deleteProject.isPending}
                    >
                      <Pencil className="mr-2 h-3.5 w-3.5" />
                      Rename
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(project.id, project.name)}
                      disabled={updateProject.isPending || deleteProject.isPending}
                    >
                      <Trash2 className="mr-2 h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </main>
      </div>
    </ChatShell>
  );
}
