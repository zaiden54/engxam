import {redirect} from "next/navigation";
import Link from "next/link";
import {z} from "zod";
import {currentActor} from "@/modules/identity/session";
import {glossaryPage} from "@/modules/glossary/service";
import {getPool} from "@/lib/db/pool";
import {Glossary} from "@/components/glossary";
import type {GlossaryData} from "@/modules/glossary/model";
import {AppError} from "@/lib/errors";
import {StudyNavigation} from "@/components/study-navigation";
export const dynamic="force-dynamic";
export default async function Page({searchParams}:{searchParams:Promise<{enrollmentId?:string;q?:string;status?:string;page?:string}>}){
  const params=await searchParams;const filters={q:params.q??"",status:params.status??"active"};let data:GlossaryData|undefined;let message="";
  try{const actor=await currentActor();const id=z.uuid().safeParse(params.enrollmentId);if(!id.success)throw new AppError("NOT_FOUND","Выберите обучение в личном кабинете.");data=await glossaryPage(getPool(),actor.id,id.data,{...filters,page:Number(params.page??1)});}catch(e){if(e instanceof AppError){if(e.code==="UNAUTHENTICATED")redirect("/login");message=e.message;}else throw e;}
  if(!data)return <section className="card"><h1>Словарь недоступен</h1><p>{message}</p><Link className="button primary" href="/account">В личный кабинет</Link></section>;
  return <><StudyNavigation enrollmentId={data.enrollmentId} current="glossary"/><Glossary data={data} filters={filters}/></>;
}
