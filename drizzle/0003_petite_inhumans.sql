CREATE TABLE "project_documents" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"original_filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"file_size" integer NOT NULL,
	"extracted_text" text DEFAULT '' NOT NULL,
	"processing_status" text DEFAULT 'processing' NOT NULL,
	"processing_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_documents_mime_type_check" CHECK ("project_documents"."mime_type" in ('application/pdf', 'text/plain')),
	CONSTRAINT "project_documents_status_check" CHECK ("project_documents"."processing_status" in ('processing', 'ready', 'failed')),
	CONSTRAINT "project_documents_file_size_check" CHECK ("project_documents"."file_size" > 0 and "project_documents"."file_size" <= 5242880)
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "project_id" text;--> statement-breakpoint
ALTER TABLE "project_documents" ADD CONSTRAINT "project_documents_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_documents_project_created_idx" ON "project_documents" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX "projects_user_updated_idx" ON "projects" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "projects_id_user_unique" ON "projects" USING btree ("id","user_id");--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_project_owner_fk" FOREIGN KEY ("project_id","user_id") REFERENCES "public"."projects"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "conversations_project_updated_idx" ON "conversations" USING btree ("project_id","updated_at");