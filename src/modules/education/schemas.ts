import { z } from "zod";
const name = z.string().trim().min(1).max(200);
const id = z.uuid();
const version = z.coerce.number().int().positive();
export const commandSchema = z.discriminatedUnion("operation", [
  z.object({ operation:z.literal("createUser"), email:z.email().trim().toLowerCase(), fullName:name, role:z.enum(["admin","teacher","student"]) }).strict(),
  z.object({ operation:z.literal("updateUser"), id, version, fullName:name, role:z.enum(["admin","teacher","student"]), active:z.boolean() }).strict(),
  z.object({ operation:z.literal("createPeriod"), name, startsOn:z.iso.date(), endsOn:z.iso.date(), preparationDeadline:z.iso.date() }).strict().refine(v=>v.endsOn>=v.startsOn && v.preparationDeadline>=v.startsOn && v.preparationDeadline<=v.endsOn,"Проверьте даты потока"),
  z.object({ operation:z.literal("updatePeriod"), id, version, name, archived:z.boolean() }).strict(),
  z.object({ operation:z.literal("createGroup"), periodId:id, name, teacherId:id.optional() }).strict(),
  z.object({ operation:z.literal("updateGroup"), id, version, name }).strict(),
  z.object({ operation:z.literal("setGroupTeacher"), id, version, teacherId:id }).strict(),
  z.object({ operation:z.literal("enroll"), studentId:id, groupId:id, specialty:name, language:z.enum(["en"]) }).strict(),
  z.object({ operation:z.literal("assign"), id, version, groupId:id }).strict(),
  z.object({ operation:z.literal("updateProfile"), id, version, dissertationTopic:z.string().trim().max(5000), supervisorName:z.string().trim().max(300) }).strict(),
]);
export type Command = z.infer<typeof commandSchema>;
export const envelopeSchema = z.object({ key:z.uuid(), command:commandSchema }).strict();
