import { sql } from "drizzle-orm";
import { check, foreignKey, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "./auth-schema";
import { projects } from "./project-schema";

export const conversations = pgTable(
  "conversations",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    projectId: text("project_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("conversations_user_updated_idx").on(table.userId, table.updatedAt),
    index("conversations_project_updated_idx").on(table.projectId, table.updatedAt),
    foreignKey({
      name: "conversations_project_owner_fk",
      columns: [table.projectId, table.userId],
      foreignColumns: [projects.id, projects.userId],
    }).onDelete("cascade"),
  ],
);

export const messages = pgTable(
  "messages",
  {
    id: text("id").primaryKey(),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("messages_conversation_created_idx").on(table.conversationId, table.createdAt),
    check("messages_role_check", sql`${table.role} in ('user', 'assistant')`),
  ],
);
