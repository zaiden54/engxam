import {z} from "zod";
import {MAX_BATCH_LINES} from "./model";
const sourceIds=z.array(z.uuid()).max(20).default([]);
export const rowInputSchema=z.object({line:z.number().int().min(1).max(MAX_BATCH_LINES),term:z.string().max(10000),translation:z.string().max(10000),definition:z.string().max(10000).default(""),context:z.string().max(10000).default(""),sourceIds}).strict();
export const previewSchema=z.object({enrollmentId:z.uuid(),text:z.string().optional(),sourceIds,rows:z.array(rowInputSchema).max(MAX_BATCH_LINES).optional()}).strict().refine(v=>(v.text!==undefined)!==(v.rows!==undefined),"Передайте текст или строки предпросмотра.");
export const commitSchema=z.object({enrollmentId:z.uuid(),key:z.uuid(),token:z.string().regex(/^[a-f0-9]{64}$/),rows:z.array(rowInputSchema).min(1).max(MAX_BATCH_LINES),selectedLines:z.array(z.number().int().min(1).max(MAX_BATCH_LINES)).min(1).max(MAX_BATCH_LINES)}).strict();
export const termFields=z.object({term:z.string().trim().min(1).max(200),translation:z.string().trim().max(1000),definition:z.string().trim().max(4000),context:z.string().trim().max(4000)}).strict();
export const mutationSchema=z.discriminatedUnion("operation",[
  z.object({operation:z.literal("save"),enrollmentId:z.uuid(),key:z.uuid(),id:z.uuid().optional(),version:z.number().int().positive().optional(),fields:termFields,sourceIds}).strict(),
  z.object({operation:z.literal("archive"),enrollmentId:z.uuid(),key:z.uuid(),id:z.uuid(),version:z.number().int().positive(),archive:z.boolean()}).strict(),
]);
