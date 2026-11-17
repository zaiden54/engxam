import {z} from "zod";
export const MAX_PDF_BYTES=50*1024*1024;
export const uploadSchema=z.object({key:z.uuid(),enrollmentId:z.uuid(),name:z.string().trim().min(1).max(250),size:z.number().int().positive().max(MAX_PDF_BYTES)}).strict();
export function normalizeDoi(value:string){return value.trim().replace(/^https?:\/\/(?:dx\.)?doi\.org\//i,"").replace(/^doi:\s*/i,"").toLowerCase();}
export const metadataSchema=z.object({
  title:z.string().trim().min(1).max(1000),authors:z.string().trim().min(1).max(2000),materialType:z.enum(["article","monograph","collection"]),publicationYear:z.number().int().min(1500).max(new Date().getFullYear()+1),publicationSource:z.string().trim().min(1).max(2000),
  doi:z.string().max(500).transform(normalizeDoi).refine(v=>v===""||/^10\.\d{4,9}\/\S+$/.test(v),"Проверьте DOI"),url:z.union([z.literal(""),z.url().refine(v=>/^https?:\/\//.test(v))]),publicationPages:z.string().trim().min(1).max(300),declaredCharacters:z.number().int().positive().max(2147483647),declaredWords:z.number().int().nonnegative().max(2147483647).nullable(),fileId:z.uuid(),
}).strict();
export const saveSchema=z.object({key:z.uuid(),enrollmentId:z.uuid(),id:z.uuid().optional(),version:z.number().int().positive().optional(),metadata:metadataSchema}).strict();
export const archiveSchema=z.object({key:z.uuid(),id:z.uuid(),version:z.number().int().positive(),archive:z.boolean()}).strict();
export type MetadataInput=z.input<typeof metadataSchema>;
