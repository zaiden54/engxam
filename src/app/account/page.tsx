import { redirect } from "next/navigation";
import { workspace } from "@/modules/education/queries";
import { Workspace } from "@/components/workspace";
import { AppError } from "@/lib/errors";
import { SignOut } from "@/components/sign-out";
export const dynamic = "force-dynamic";
export default async function Account({searchParams}:{searchParams:Promise<{page?:string}>}) {
  let data;let message="";
  try{data=await workspace(Number((await searchParams).page??1));}
  catch(error){if(error instanceof AppError){if(error.code==="UNAUTHENTICATED")redirect("/login");message=error.message;}else throw error;}
  if(!data)return <section className="card"><h1>Доступ не назначен</h1><p>{message}</p><SignOut/></section>;
  return <Workspace data={data}/>;
}
