import {pgTable,uuid,text,integer,timestamp,unique,foreignKey,index,type AnyPgColumn} from "drizzle-orm/pg-core";
import {enrollments,users} from "./index";
import {literature} from "./literature";
export const glossaryTerms=pgTable("glossary_term",{
  id:uuid("id").defaultRandom().primaryKey(),enrollmentId:uuid("enrollment_id").notNull().references(()=>enrollments.id),normalizedTerm:text("normalized_term").notNull(),currentRevisionId:uuid("current_revision_id").references(():AnyPgColumn=>glossaryRevisions.id),archivedAt:timestamp("archived_at",{withTimezone:true}),version:integer("version").default(1).notNull(),createdAt:timestamp("created_at",{withTimezone:true}).defaultNow().notNull(),updatedAt:timestamp("updated_at",{withTimezone:true}).defaultNow().notNull(),
},t=>[unique("term_normalized_owner").on(t.enrollmentId,t.normalizedTerm),unique("term_id_owner").on(t.id,t.enrollmentId),index("term_owner_archive_idx").on(t.enrollmentId,t.archivedAt)]);
export const glossaryRevisions=pgTable("glossary_term_revision",{
  id:uuid("id").defaultRandom().primaryKey(),termId:uuid("term_id").notNull().references(()=>glossaryTerms.id),revisionNo:integer("revision_no").notNull(),term:text("term").notNull(),translation:text("translation").default("").notNull(),definition:text("definition").default("").notNull(),context:text("context").default("").notNull(),createdBy:uuid("created_by").notNull().references(()=>users.id),createdAt:timestamp("created_at",{withTimezone:true}).defaultNow().notNull(),
},t=>[unique("term_revision_no").on(t.termId,t.revisionNo),unique("term_revision_owner").on(t.id,t.termId)]);
export const termSources=pgTable("term_source",{
  id:uuid("id").defaultRandom().primaryKey(),termId:uuid("term_id").notNull(),literatureId:uuid("literature_id").notNull(),enrollmentId:uuid("enrollment_id").notNull(),createdAt:timestamp("created_at",{withTimezone:true}).defaultNow().notNull(),
},t=>[unique("term_source_pair").on(t.termId,t.literatureId),foreignKey({columns:[t.termId,t.enrollmentId],foreignColumns:[glossaryTerms.id,glossaryTerms.enrollmentId]}),foreignKey({columns:[t.literatureId,t.enrollmentId],foreignColumns:[literature.id,literature.enrollmentId]})]);
