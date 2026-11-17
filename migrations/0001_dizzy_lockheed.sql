CREATE TABLE "file_asset" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enrollment_id" uuid NOT NULL,
	"uploaded_by" uuid NOT NULL,
	"upload_request_id" uuid NOT NULL,
	"storage_key" text NOT NULL,
	"temporary_key" text NOT NULL,
	"original_name" text NOT NULL,
	"expected_size" integer NOT NULL,
	"size_bytes" integer,
	"sha256" text,
	"page_count" integer,
	"status" text DEFAULT 'uploading' NOT NULL,
	"failure_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "file_asset_storage_key_unique" UNIQUE("storage_key"),
	CONSTRAINT "file_asset_temporary_key_unique" UNIQUE("temporary_key"),
	CONSTRAINT "file_asset_id_owner" UNIQUE("id","enrollment_id"),
	CONSTRAINT "file_asset_upload_request" UNIQUE("uploaded_by","upload_request_id"),
	CONSTRAINT "file_status" CHECK ("file_asset"."status" in ('uploading','ready','failed','deleting','deleted')),
	CONSTRAINT "file_expected_size" CHECK ("file_asset"."expected_size">0 and "file_asset"."expected_size"<=52428800),
	CONSTRAINT "file_ready_valid" CHECK ("file_asset"."status"<>'ready' or ("file_asset"."sha256" is not null and "file_asset"."size_bytes">0 and "file_asset"."page_count">0))
);
--> statement-breakpoint
CREATE TABLE "literature" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enrollment_id" uuid NOT NULL,
	"material_type" text NOT NULL,
	"canonical_doi" text,
	"current_revision_id" uuid,
	"archived_at" timestamp with time zone,
	"file_locked_at" timestamp with time zone,
	"pending_defense_count" integer DEFAULT 0 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "literature_id_owner" UNIQUE("id","enrollment_id"),
	CONSTRAINT "literature_type" CHECK ("literature"."material_type" in ('article','monograph','collection')),
	CONSTRAINT "literature_pending_count" CHECK ("literature"."pending_defense_count">=0)
);
--> statement-breakpoint
CREATE TABLE "literature_revision" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"literature_id" uuid NOT NULL,
	"enrollment_id" uuid NOT NULL,
	"revision_no" integer NOT NULL,
	"title" text NOT NULL,
	"authors" text NOT NULL,
	"publication_year" integer NOT NULL,
	"publication_source" text NOT NULL,
	"url" text,
	"publication_pages" text NOT NULL,
	"declared_characters" integer NOT NULL,
	"declared_words" integer,
	"file_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "revision_no_per_literature" UNIQUE("literature_id","revision_no"),
	CONSTRAINT "revision_id_literature" UNIQUE("id","literature_id"),
	CONSTRAINT "revision_counts" CHECK ("literature_revision"."declared_characters">0 and ("literature_revision"."declared_words" is null or "literature_revision"."declared_words">=0))
);
--> statement-breakpoint
ALTER TABLE "file_asset" ADD CONSTRAINT "file_asset_enrollment_id_enrollment_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_asset" ADD CONSTRAINT "file_asset_uploaded_by_app_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "literature" ADD CONSTRAINT "literature_enrollment_id_enrollment_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "literature" ADD CONSTRAINT "literature_current_revision_id_literature_revision_id_fk" FOREIGN KEY ("current_revision_id") REFERENCES "public"."literature_revision"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "literature_revision" ADD CONSTRAINT "literature_revision_created_by_app_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "literature_revision" ADD CONSTRAINT "literature_revision_literature_id_enrollment_id_literature_id_enrollment_id_fk" FOREIGN KEY ("literature_id","enrollment_id") REFERENCES "public"."literature"("id","enrollment_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "literature_revision" ADD CONSTRAINT "literature_revision_file_id_enrollment_id_file_asset_id_enrollment_id_fk" FOREIGN KEY ("file_id","enrollment_id") REFERENCES "public"."file_asset"("id","enrollment_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "file_asset_ready_hash" ON "file_asset" USING btree ("enrollment_id","sha256") WHERE "file_asset"."status"='ready';--> statement-breakpoint
CREATE INDEX "file_cleanup_idx" ON "file_asset" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "literature_owner_doi" ON "literature" USING btree ("enrollment_id","canonical_doi") WHERE "literature"."canonical_doi" is not null;--> statement-breakpoint
CREATE INDEX "literature_owner_idx" ON "literature" USING btree ("enrollment_id");