import { workspace } from "@/modules/education/queries";
import { Workspace } from "@/components/workspace";
import { AccessDenied } from "@/components/access-denied";
import { StudyShell } from "@/components/site-shell";
import { pageActor } from "@/modules/identity/page-actor";
import { studyContext } from "@/modules/education/study-context";
import { StudyUnavailable } from "@/components/study-navigation";

export const dynamic = "force-dynamic";

export default async function Account({ searchParams }: {
  searchParams: Promise<{ page?: string; enrollmentId?: string | string[] }>;
}) {
  const actor = await pageActor();
  if (!actor) return <AccessDenied/>;
  const params = await searchParams;
  const [data, context] = await Promise.all([
    workspace(actor, Number(params.page ?? 1)),
    actor.role === "admin" ? null : studyContext(actor.id, params.enrollmentId),
  ]);
  return <StudyShell current="account" role={actor.role} enrollmentId={context?.selected?.id}>
    {context?.unavailable ? <StudyUnavailable/> : <Workspace data={data} enrollmentId={context?.selected?.id}/>}
  </StudyShell>;
}
