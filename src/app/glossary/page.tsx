import { getPool } from "@/lib/db/pool";
import { AppError } from "@/lib/errors";
import { pageActor } from "@/modules/identity/page-actor";
import { studyContext } from "@/modules/education/study-context";
import { glossaryPage } from "@/modules/glossary/service";
import { Glossary } from "@/components/glossary";
import { AccessDenied } from "@/components/access-denied";
import { NoStudy, SelectGroup, StudyContextLabel, StudyUnavailable } from "@/components/study-navigation";
import { StudyShell } from "@/components/site-shell";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: {
  searchParams: Promise<{ enrollmentId?: string | string[]; q?: string; status?: string; page?: string }>;
}) {
  const actor = await pageActor();
  if (!actor) return <AccessDenied/>;
  const params = await searchParams;
  const { selected, unavailable } = await studyContext(actor.id, params.enrollmentId);
  const filters = { q: params.q ?? "", status: params.status ?? "active" };
  let data;
  let denied = unavailable || actor.role === "admin";
  if (!denied && selected) {
    try {
      data = await glossaryPage(getPool(), actor.id, selected.id, { ...filters, page: Number(params.page ?? 1) });
    } catch (error) {
      if (!(error instanceof AppError) || error.code !== "NOT_FOUND") throw error;
      denied = true;
    }
  }
  return <StudyShell current="glossary" role={actor.role} enrollmentId={denied ? undefined : selected?.id}>
    {denied ? <StudyUnavailable/> : <>
      {!data && <h1>Словарь терминов</h1>}
      {selected ? <StudyContextLabel selected={selected}/> : actor.role === "teacher" ? <SelectGroup/> : <NoStudy/>}
      {data && <Glossary key={data.enrollmentId} data={data} filters={filters}/>}
    </>}
  </StudyShell>;
}
