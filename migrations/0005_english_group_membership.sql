ALTER TABLE "enrollment" DROP CONSTRAINT "enrollment_student_period";--> statement-breakpoint
ALTER TABLE "enrollment" ALTER COLUMN "teacher_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "enrollment" ADD COLUMN "current" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "academic_group" ADD COLUMN "teacher_id" uuid;--> statement-breakpoint
ALTER TABLE "academic_group" ADD CONSTRAINT "academic_group_teacher_id_teacher_profile_user_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teacher_profile"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
DO $$
DECLARE
  mapping jsonb := coalesce(nullif(current_setting('engxam.english_group_mapping', true), '')::jsonb, '{}'::jsonb);
  selected jsonb := coalesce(mapping->'currentByStudent', '{}'::jsonb);
  teachers jsonb := coalesce(mapping->'teacherByGroup', '{}'::jsonb);
BEGIN
  IF EXISTS (
    SELECT 1 FROM jsonb_each_text(selected) choice
    WHERE NOT EXISTS (
      SELECT 1 FROM enrollment e WHERE e.student_id = choice.key::uuid AND e.id = choice.value::uuid
    )
  ) OR EXISTS (
    SELECT 1 FROM jsonb_each_text(teachers) choice
    WHERE NOT EXISTS (SELECT 1 FROM academic_group g WHERE g.id = choice.key::uuid)
      OR NOT EXISTS (
        SELECT 1 FROM teacher_profile tp JOIN app_user u ON u.id = tp.user_id
        WHERE tp.user_id = choice.value::uuid AND u.active AND u.role = 'teacher'
      )
  ) THEN
    RAISE EXCEPTION 'Invalid English group mapping: check enrollment ownership, group IDs and active teachers.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM enrollment e GROUP BY e.student_id
    HAVING count(*) > 1 AND NOT (selected ? e.student_id::text)
  ) OR EXISTS (
    SELECT 1 FROM enrollment e GROUP BY e.group_id
    HAVING count(DISTINCT e.teacher_id) > 1 AND NOT (teachers ? e.group_id::text)
  ) THEN
    RAISE EXCEPTION 'English group conflicts require confirmed choices. Run scripts/reconcile-english-groups.ts report before retrying.';
  END IF;

  UPDATE enrollment e SET current = (e.id = (selected->>e.student_id::text)::uuid)
  WHERE selected ? e.student_id::text;

  UPDATE academic_group g SET teacher_id = choice.value::uuid
  FROM jsonb_each_text(teachers) choice WHERE g.id = choice.key::uuid;

  UPDATE academic_group g SET teacher_id = old.teacher_id
  FROM (SELECT DISTINCT group_id, teacher_id FROM enrollment) old
  JOIN app_user u ON u.id = old.teacher_id AND u.active AND u.role = 'teacher'
  WHERE g.id = old.group_id AND NOT (teachers ? g.id::text);

  IF EXISTS (
    SELECT 1 FROM enrollment e JOIN academic_group g ON g.id = e.group_id
    WHERE e.current AND g.teacher_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Current English groups need an active teacher. Check the reconciliation report.';
  END IF;
END $$;--> statement-breakpoint
CREATE UNIQUE INDEX "enrollment_current_student_idx" ON "enrollment" USING btree ("student_id") WHERE "enrollment"."current";--> statement-breakpoint
CREATE INDEX "enrollment_current_group_idx" ON "enrollment" USING btree ("group_id") WHERE "enrollment"."current";--> statement-breakpoint
CREATE INDEX "academic_group_teacher_idx" ON "academic_group" USING btree ("teacher_id");
