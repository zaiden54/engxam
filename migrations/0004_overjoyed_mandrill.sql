CREATE TABLE "glossary_term_revision" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"term_id" uuid NOT NULL,
	"revision_no" integer NOT NULL,
	"term" text NOT NULL,
	"translation" text DEFAULT '' NOT NULL,
	"definition" text DEFAULT '' NOT NULL,
	"context" text DEFAULT '' NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "term_revision_no" UNIQUE("term_id","revision_no"),
	CONSTRAINT "term_revision_owner" UNIQUE("id","term_id")
);
--> statement-breakpoint
CREATE TABLE "glossary_term" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enrollment_id" uuid NOT NULL,
	"normalized_term" text NOT NULL,
	"current_revision_id" uuid,
	"archived_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "term_normalized_owner" UNIQUE("enrollment_id","normalized_term"),
	CONSTRAINT "term_id_owner" UNIQUE("id","enrollment_id")
);
--> statement-breakpoint
CREATE TABLE "term_source" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"term_id" uuid NOT NULL,
	"literature_id" uuid NOT NULL,
	"enrollment_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "term_source_pair" UNIQUE("term_id","literature_id")
);
--> statement-breakpoint
ALTER TABLE "glossary_term_revision" ADD CONSTRAINT "glossary_term_revision_term_id_glossary_term_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."glossary_term"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "glossary_term_revision" ADD CONSTRAINT "glossary_term_revision_created_by_app_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "glossary_term" ADD CONSTRAINT "glossary_term_enrollment_id_enrollment_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "glossary_term" ADD CONSTRAINT "glossary_term_current_revision_id_glossary_term_revision_id_fk" FOREIGN KEY ("current_revision_id") REFERENCES "public"."glossary_term_revision"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "term_source" ADD CONSTRAINT "term_source_term_id_enrollment_id_glossary_term_id_enrollment_id_fk" FOREIGN KEY ("term_id","enrollment_id") REFERENCES "public"."glossary_term"("id","enrollment_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "term_source" ADD CONSTRAINT "term_source_literature_id_enrollment_id_literature_id_enrollment_id_fk" FOREIGN KEY ("literature_id","enrollment_id") REFERENCES "public"."literature"("id","enrollment_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "term_owner_archive_idx" ON "glossary_term" USING btree ("enrollment_id","archived_at");--> statement-breakpoint
ALTER TABLE glossary_term ADD CONSTRAINT glossary_current_revision_owner FOREIGN KEY (current_revision_id,id) REFERENCES glossary_term_revision(id,term_id) DEFERRABLE INITIALLY DEFERRED;
