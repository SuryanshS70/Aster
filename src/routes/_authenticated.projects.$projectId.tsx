import { useState, type FormEvent } from "react";
import {
  ArrowLeft,
  FileText,
  FolderOpen,
  LoaderCircle,
  MessageSquare,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";

import { ChatShell } from "@/components/chat/ChatShell";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useConversations, useCreateConversation } from "@/hooks/useConversations";
import {
  useDeleteProject,
  useDeleteProjectDocument,
  useProject,
  useProjectDocuments,
  useUpdateProject,
  useUploadProjectDocument,
} from "@/hooks/useProjects";

export const Route = createFileRoute("/_authenticated/projects/$projectId")({
  component: ProjectDetailPage,
});

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function ProjectDetailPage() {
  const { projectId } = Route.useParams();
  const navigate = useNavigate();
  const project = useProject(projectId);
  const documents = useProjectDocuments(projectId);
  const conversations = useConversations();
  const createConversation = useCreateConversation();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const uploadDocument = useUploadProjectDocument(projectId);
  const deleteDocument = useDeleteProjectDocument(projectId);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);

  const projectConversations =
    conversations.data?.filter((conversation) => conversation.projectId === projectId) ?? [];

  async function handleRename() {
    if (!project.data || typeof window === "undefined") return;
    const name = window.prompt("Rename project", project.data.name)?.trim();
    if (!name || name === project.data.name) return;
    setFeedback(null);
    try {
      await updateProject.mutateAsync({ id: projectId, input: { name } });
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Couldn't rename the project.");
    }
  }

  async function handleDeleteProject() {
    if (
      !project.data ||
      (typeof window !== "undefined" &&
        !window.confirm('Delete "' + project.data.name + '" and all of its chats and documents?'))
    ) {
      return;
    }
    setFeedback(null);
    try {
      await deleteProject.mutateAsync(projectId);
      navigate({ to: "/projects" });
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Couldn't delete the project.");
    }
  }

  async function handleUpload(event: FormEvent) {
    event.preventDefault();
    if (!selectedFile) return;
    setFeedback(null);
    try {
      const document = await uploadDocument.mutateAsync(selectedFile);
      setSelectedFile(null);
      setFileInputKey((value) => value + 1);
      if (document.processingStatus === "failed") {
        setFeedback(document.processingError || "Text extraction failed.");
      } else {
        setFeedback("Document is ready to use in project chats.");
      }
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Couldn't upload the document.");
    }
  }

  async function handleDeleteDocument(documentId: string, filename: string) {
    if (
      typeof window !== "undefined" &&
      !window.confirm('Delete "' + filename + '" from this project?')
    ) {
      return;
    }
    setFeedback(null);
    try {
      await deleteDocument.mutateAsync(documentId);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Couldn't delete the document.");
    }
  }

  async function handleNewChat() {
    setFeedback(null);
    try {
      const conversation = await createConversation.mutateAsync({ projectId });
      navigate({
        to: "/chat/$conversationId",
        params: { conversationId: conversation.id },
      });
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Couldn't create the project chat.");
    }
  }

  return (
    <ChatShell title={project.data?.name ?? "Project"}>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <main className="mx-auto w-full max-w-4xl space-y-8 p-6 pb-12">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/projects">
              <ArrowLeft className="mr-2 h-4 w-4" />
              All projects
            </Link>
          </Button>

          {project.isLoading && (
            <div className="flex justify-center py-16">
              <LoadingSpinner className="h-6 w-6" />
            </div>
          )}
          {project.isError && (
            <ErrorState title="Couldn't load this project" onRetry={() => project.refetch()} />
          )}

          {project.data && (
            <>
              <section className="rounded-2xl border bg-card p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="rounded-xl bg-primary/10 p-2 text-primary">
                        <FolderOpen className="h-5 w-5" />
                      </span>
                      <h2 className="font-serif text-3xl">{project.data.name}</h2>
                    </div>
                    <p className="mt-3 max-w-2xl text-muted-foreground">
                      {project.data.description || "No project description."}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRename}
                      disabled={updateProject.isPending}
                    >
                      <Pencil className="mr-2 h-3.5 w-3.5" />
                      Rename
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDeleteProject}
                      disabled={deleteProject.isPending}
                    >
                      <Trash2 className="mr-2 h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </div>
                </div>
              </section>

              <section>
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h3 className="font-serif text-2xl">Documents</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      PDF and UTF-8 plain text, up to 5 MB each.
                    </p>
                  </div>
                </div>

                <form
                  onSubmit={handleUpload}
                  className="mt-4 flex flex-col gap-3 rounded-2xl border bg-card p-5 sm:flex-row sm:items-end"
                >
                  <div className="min-w-0 flex-1">
                    <Input
                      key={fileInputKey}
                      type="file"
                      accept=".pdf,.txt,application/pdf,text/plain"
                      onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                      disabled={uploadDocument.isPending}
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={!selectedFile || uploadDocument.isPending}
                    className="gap-2"
                  >
                    {uploadDocument.isPending ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    {uploadDocument.isPending ? "Processing?" : "Upload"}
                  </Button>
                </form>

                {feedback && (
                  <p
                    className={
                      "mt-3 text-sm " +
                      (feedback.includes("ready") ? "text-muted-foreground" : "text-destructive")
                    }
                  >
                    {feedback}
                  </p>
                )}

                <div className="mt-4 space-y-2">
                  {documents.isLoading && (
                    <div className="flex justify-center py-8">
                      <LoadingSpinner className="h-5 w-5" />
                    </div>
                  )}
                  {documents.isError && (
                    <ErrorState
                      title="Couldn't load documents"
                      onRetry={() => documents.refetch()}
                    />
                  )}
                  {documents.data?.length === 0 && (
                    <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                      Upload a document to add project knowledge.
                    </div>
                  )}
                  {documents.data?.map((document) => (
                    <article
                      key={document.id}
                      className="flex items-start gap-3 rounded-xl border bg-card p-4"
                    >
                      <FileText className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{document.originalFilename}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatFileSize(document.fileSize)}</span>
                          <Badge
                            variant={
                              document.processingStatus === "failed"
                                ? "destructive"
                                : document.processingStatus === "ready"
                                  ? "secondary"
                                  : "outline"
                            }
                          >
                            {document.processingStatus === "processing"
                              ? "Processing"
                              : document.processingStatus === "ready"
                                ? "Ready"
                                : "Failed"}
                          </Badge>
                        </div>
                        {document.processingError && (
                          <p className="mt-2 text-sm text-destructive">
                            {document.processingError}
                          </p>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={"Delete " + document.originalFilename}
                        onClick={() => handleDeleteDocument(document.id, document.originalFilename)}
                        disabled={deleteDocument.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </article>
                  ))}
                </div>
              </section>

              <section>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-serif text-2xl">Project chats</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      These conversations use ready project documents as context.
                    </p>
                  </div>
                  <Button
                    onClick={handleNewChat}
                    disabled={createConversation.isPending}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    New project chat
                  </Button>
                </div>

                <div className="mt-4 grid gap-2">
                  {conversations.isLoading && (
                    <div className="flex justify-center py-8">
                      <LoadingSpinner className="h-5 w-5" />
                    </div>
                  )}
                  {projectConversations.length === 0 && !conversations.isLoading && (
                    <div className="rounded-2xl border border-dashed p-8 text-center">
                      <MessageSquare className="mx-auto h-5 w-5 text-muted-foreground" />
                      <p className="mt-2 text-sm text-muted-foreground">
                        No chats in this project yet.
                      </p>
                    </div>
                  )}
                  {projectConversations.map((conversation) => (
                    <Link
                      key={conversation.id}
                      to="/chat/$conversationId"
                      params={{ conversationId: conversation.id }}
                      className="flex items-center gap-3 rounded-xl border bg-card p-4 transition hover:bg-accent"
                    >
                      <MessageSquare className="h-4 w-4 text-primary" />
                      <span className="truncate">{conversation.title}</span>
                    </Link>
                  ))}
                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </ChatShell>
  );
}
