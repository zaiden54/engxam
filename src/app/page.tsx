import Link from "next/link";
import { AppError } from "@/lib/errors";
import { studySummary } from "@/modules/education/study-summary";
import { SourceProgress, TermProgress } from "@/components/study-progress";
import { pageActor } from "@/modules/identity/page-actor";
import { studyContext } from "@/modules/education/study-context";
import { AccessDenied } from "@/components/access-denied";
import { StudyShell, studyHref } from "@/components/site-shell";
import { NoStudy, StudySelection, StudyUnavailable } from "@/components/study-navigation";

export default async function Home({ searchParams }: {
  searchParams: Promise<{ enrollmentId?: string | string[] }>;
}) {
  const actor = await pageActor();
  if (!actor) return <AccessDenied/>;
  if (actor.role === "admin") return <StudyShell current="home" role={actor.role}>
    <h1>Главная</h1><Link className="button primary" href="/account">Управление обучением</Link>
  </StudyShell>;

  const { choices, selected, unavailable } = await studyContext(actor.id, (await searchParams).enrollmentId);
  let summary;
  if (selected) {
    try {
      summary = await studySummary(actor.id, selected.id);
    } catch (error) {
      if (!(error instanceof AppError) || error.code !== "NOT_FOUND") throw error;
      return <StudyShell current="home" role={actor.role}><StudyUnavailable/></StudyShell>;
    }
  }
  return <StudyShell current="home" role={actor.role} enrollmentId={selected?.id}>
    {unavailable ? <StudyUnavailable/> : <>
      <div className="dashboard-heading"><h1>Главная</h1></div>
      {choices.length ? <StudySelection choices={choices} selected={selected} action="/"/> : <NoStudy/>}
      {selected && summary && <div className="dashboard-grid">
        <article><SourceProgress {...summary.sources}/>
          <Link className="button" href={studyHref("library", selected.id)}>Открыть источники</Link></article>
        <article><TermProgress {...summary.terms}/>
          <Link className="button" href={studyHref("glossary", selected.id)}>Открыть словарь</Link></article>
      </div>}
    </>}
  </StudyShell>;
}
