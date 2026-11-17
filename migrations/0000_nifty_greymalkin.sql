CREATE TABLE "audit_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"entity_id" uuid,
	"details" jsonb NOT NULL,
	"request_id" uuid NOT NULL,
	"happened_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "enrollment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"teacher_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	"period_id" uuid NOT NULL,
	"specialty" text NOT NULL,
	"language" text DEFAULT 'en' NOT NULL,
	"dissertation_topic" text DEFAULT '' NOT NULL,
	"supervisor_name" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "enrollment_student_period" UNIQUE("student_id","period_id")
);
--> statement-breakpoint
CREATE TABLE "academic_group" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"period_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "group_name_period" UNIQUE("period_id","name"),
	CONSTRAINT "group_period_id" UNIQUE("id","period_id")
);
--> statement-breakpoint
CREATE TABLE "idempotency_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid NOT NULL,
	"operation" text NOT NULL,
	"key" uuid NOT NULL,
	"payload_hash" text NOT NULL,
	"result" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "idempotency_actor_operation_key" UNIQUE("actor_id","operation","key")
);
--> statement-breakpoint
CREATE TABLE "academic_period" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date NOT NULL,
	"preparation_deadline" date NOT NULL,
	"target_characters" integer DEFAULT 600000 NOT NULL,
	"target_terms" integer DEFAULT 500 NOT NULL,
	"timezone" text DEFAULT 'Europe/Moscow' NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "period_dates" CHECK ("academic_period"."ends_on" >= "academic_period"."starts_on"),
	CONSTRAINT "period_targets" CHECK ("academic_period"."target_characters">0 and "academic_period"."target_terms">0)
);
--> statement-breakpoint
CREATE TABLE "student_profile" (
	"user_id" uuid PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teacher_profile" (
	"user_id" uuid PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_id" text,
	"email" text NOT NULL,
	"full_name" text NOT NULL,
	"role" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "app_user_auth_id_unique" UNIQUE("auth_id"),
	CONSTRAINT "app_user_role" CHECK ("app_user"."role" in ('admin','teacher','student'))
);
--> statement-breakpoint
ALTER TABLE "audit_event" ADD CONSTRAINT "audit_event_actor_id_app_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollment" ADD CONSTRAINT "enrollment_student_id_student_profile_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student_profile"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollment" ADD CONSTRAINT "enrollment_teacher_id_teacher_profile_user_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teacher_profile"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollment" ADD CONSTRAINT "enrollment_group_id_period_id_academic_group_id_period_id_fk" FOREIGN KEY ("group_id","period_id") REFERENCES "public"."academic_group"("id","period_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academic_group" ADD CONSTRAINT "academic_group_period_id_academic_period_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."academic_period"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idempotency_request" ADD CONSTRAINT "idempotency_request_actor_id_app_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_profile" ADD CONSTRAINT "student_profile_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_profile" ADD CONSTRAINT "teacher_profile_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "enrollment_teacher_idx" ON "enrollment" USING btree ("teacher_id");--> statement-breakpoint
CREATE UNIQUE INDEX "app_user_email_key" ON "app_user" USING btree (lower("email"));