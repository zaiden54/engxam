ALTER TABLE "file_asset" ADD COLUMN "temporary_cleaned_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE literature ADD CONSTRAINT literature_current_revision_owner FOREIGN KEY (current_revision_id,id) REFERENCES literature_revision(id,literature_id) DEFERRABLE INITIALLY DEFERRED;
