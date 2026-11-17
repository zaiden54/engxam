import {redirect} from "next/navigation";
import Link from "next/link";
import {z} from "zod";
import {currentActor} from "@/modules/identity/session";
import {listLibrary} from "@/modules/literature/service";
import {getPool} from "@/lib/db/pool";
import {Library,type LibraryData} from "@/components/library";
import {AppError} from "@/lib/errors";
import {StudyNavigation} from "@/components/study-navigation";
export const dynamic="force-dynamic";
export default async function LibraryPage({searchParams}:{searchParams:Promise<{enrollmentId?:string;q?:string;type?:string;archived?:string;page?:string}>}){
  const params=await searchParams;let data:LibraryData|undefined;let error="";
  const filters={q:params.q??"",type:params.type??"",archived:params.archived==="1"};
  try{const actor=await currentActor();const id=z.uuid().safeParse(params.enrollmentId);if(!id.success)throw new AppError("NOT_FOUND","Выберите обучение в личном кабинете.");data=await listLibrary(getPool(),actor.id,id.data,{...filters,page:Number(params.page??1)});}catch(e){if(e instanceof AppError){if(e.code==="UNAUTHENTICATED")redirect("/login");error=e.message;}else throw e;}
  if(!data)return <section className="card"><h1>Библиотека недоступна</h1><p>{error}</p><Link className="button primary" href="/account">В личный кабинет</Link></section>;
  return <><StudyNavigation enrollmentId={data.enrollmentId} current="library"/><Library data={data} filters={filters}/></>;
}
