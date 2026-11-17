export const MAX_BATCH_LINES=500;
export const MAX_BATCH_BYTES=100*1024;
export function cleanTerm(term:string){return term.normalize("NFKC").trim().replace(/\s+/gu," ");}
export function normalizeTerm(term:string){return cleanTerm(term).toLowerCase();}
export type RowInput={line:number;term:string;translation:string;definition:string;context:string;sourceIds:string[]};
export type PreviewRow=RowInput&{status:"new"|"draft"|"duplicate"|"archived"|"error"|"empty";message:string;existingId?:string};
export type Preview={rows:PreviewRow[];token:string;counts:Record<PreviewRow["status"],number>};
export type TermView={id:string;version:number;term:string;translation:string;definition:string;context:string;archivedAt:string|null;createdAt:string;revisionNo:number;sourceIds:string[]};
export type GlossaryData={enrollmentId:string;canEdit:boolean;items:TermView[];page:number;hasNext:boolean;total:number;drafts:number;sources:{id:string;title:string}[]};
