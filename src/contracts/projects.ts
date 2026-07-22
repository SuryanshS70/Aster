import { z } from "zod";

export const MAX_DOCUMENT_FILE_BYTES = 5 * 1024 * 1024;
export const DOCUMENT_UPLOAD_REQUEST_LIMIT_BYTES = MAX_DOCUMENT_FILE_BYTES + 64 * 1024;

export const projectIdSchema = z
  .string()
  .trim()
  .min(1, "Project ID is required")
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/, "Project ID contains invalid characters");

export const projectNameSchema = z
  .string()
  .trim()
  .min(1, "Project name is required")
  .max(80, "Project name must be 80 characters or fewer");

export const projectDescriptionSchema = z
  .string()
  .trim()
  .max(500, "Project description must be 500 characters or fewer");

export const createProjectInputSchema = z
  .object({
    name: projectNameSchema,
    description: projectDescriptionSchema.optional(),
  })
  .strict();

export const updateProjectInputSchema = z
  .object({
    name: projectNameSchema.optional(),
    description: projectDescriptionSchema.nullable().optional(),
  })
  .strict()
  .refine((input) => input.name !== undefined || input.description !== undefined, {
    message: "At least one project field is required",
  });

export const projectSchema = z
  .object({
    id: projectIdSchema,
    name: projectNameSchema,
    description: projectDescriptionSchema.nullable(),
    createdAt: z.string().datetime({ offset: true }),
    updatedAt: z.string().datetime({ offset: true }),
  })
  .strict();

export const projectListSchema = z.array(projectSchema);

export const projectDocumentIdSchema = z
  .string()
  .trim()
  .min(1, "Document ID is required")
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/, "Document ID contains invalid characters");

export const projectDocumentMimeTypeSchema = z.enum(["application/pdf", "text/plain"]);
export const projectDocumentStatusSchema = z.enum(["processing", "ready", "failed"]);

export const projectDocumentSchema = z
  .object({
    id: projectDocumentIdSchema,
    projectId: projectIdSchema,
    originalFilename: z.string().min(1).max(255),
    mimeType: projectDocumentMimeTypeSchema,
    fileSize: z.number().int().positive().max(MAX_DOCUMENT_FILE_BYTES),
    processingStatus: projectDocumentStatusSchema,
    processingError: z.string().max(500).nullable(),
    createdAt: z.string().datetime({ offset: true }),
    updatedAt: z.string().datetime({ offset: true }),
  })
  .strict();

export const projectDocumentListSchema = z.array(projectDocumentSchema);

export type Project = z.infer<typeof projectSchema>;
export type CreateProjectInput = z.infer<typeof createProjectInputSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectInputSchema>;
export type ProjectDocument = z.infer<typeof projectDocumentSchema>;
export type ProjectDocumentMimeType = z.infer<typeof projectDocumentMimeTypeSchema>;
export type ProjectDocumentStatus = z.infer<typeof projectDocumentStatusSchema>;
