import {AppError} from "@/lib/errors";
export async function batchBody(request:Request){
  const reader=request.body?.getReader();if(!reader)throw new AppError("VALIDATION_ERROR","Пустой запрос.");const chunks:Uint8Array[]=[];let size=0;
  try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>1024*1024){await reader.cancel();throw new AppError("VALIDATION_ERROR","Запрос слишком большой. Пакет ограничен 500 строками и 100 КБ текста.");}chunks.push(value);}}finally{reader.releaseLock();}
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
