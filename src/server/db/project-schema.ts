import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

import { MAX_DOCUMENT_FILE_BYTES } from "../../contracts/projects";
import { user } from "./auth-schema";

export const projects = pgTable(
  "projects",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("projects_user_updated_idx").on(table.userId, table.updatedAt),
    uniqueIndex("projects_id_user_unique").on(table.id, table.userId),
  ],
);

export const projectDocuments = pgTable(
  "project_documents",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    originalFilename: text("original_filename").notNull(),
    mimeType: text("mime_type").notNull(),
    fileSize: integer("file_size").notNull(),
    extractedText: text("extracted_text").default("").notNull(),
    processingStatus: text("processing_status").default("processing").notNull(),
    processingError: text("processing_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("project_documents_project_created_idx").on(table.projectId, table.createdAt),
    check(
      "project_documents_mime_type_check",
      sql`${table.mimeType} in ('application/pdf', 'text/plain')`,
    ),
    check(
      "project_documents_status_check",
      sql`${table.processingStatus} in ('processing', 'ready', 'failed')`,
    ),
    check(
      "project_documents_file_size_check",
      sql`${table.fileSize} > 0 and ${table.fileSize} <= ${sql.raw(String(MAX_DOCUMENT_FILE_BYTES))}`,
    ),
  ],
);
