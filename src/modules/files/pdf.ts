import {createHash} from "node:crypto";
import {PDFDocument} from "pdf-lib";
import {AppError} from "../../lib/errors";
import {MAX_PDF_BYTES} from "../literature/schemas";
export async function inspectPdf(bytes:Uint8Array){
  if(!bytes.length||bytes.length>MAX_PDF_BYTES)throw new AppError("VALIDATION_ERROR","Размер PDF должен быть от 1 байта до 50 МБ.");
  if(Buffer.from(bytes.subarray(0,5)).toString()!=="%PDF-")throw new AppError("VALIDATION_ERROR","Файл не является PDF.");
  try{
    const pdf=await PDFDocument.load(bytes,{throwOnInvalidObject:true,updateMetadata:false});
    const pageCount=pdf.getPageCount();if(!pageCount)throw Error("Empty PDF");
    return {sha256:createHash("sha256").update(bytes).digest("hex"),pageCount,sizeBytes:bytes.length};
  }catch{throw new AppError("VALIDATION_ERROR","PDF повреждён, зашифрован или не содержит страниц. Загрузите обычный PDF без пароля.");}
}
