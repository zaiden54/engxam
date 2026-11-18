import Link from "next/link";
import { AppError } from "@/lib/errors";
import { studySummary } from "@/modules/education/study-summary";
import { SourceProgress, TermProgress } from "@/components/study-progress";
import { pageActor } from "@/modules/identity/page-actor";
import { studyContext, teacherGroups } from "@/modules/education/study-context";
import { AccessDenied } from "@/components/access-denied";
import { StudyShell, studyHref } from "@/components/site-shell";
import { NoStudy, StudyContextLabel, StudyUnavailable, TeacherGroups } from "@/components/study-navigation";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";

export default async function Home({ searchParams }: {
  searchParams: Promise<{ enrollmentId?: string | string[]; groupId?: string | string[] }>;
}) {
  const actor = await pageActor();
  if (!actor) return <AccessDenied/>;
  if (actor.role === "admin") return <StudyShell current="home" role={actor.role}>
    <PageHeader title="Главная" /><Button asChild><Link href="/account">Управление обучением</Link></Button>
  </StudyShell>;

  const { enrollmentId, groupId } = await searchParams;
  if (actor.role === "teacher" && enrollmentId === undefined) {
    const groups = await teacherGroups(actor.id, groupId);
    return <StudyShell current="home" role={actor.role}>
      <PageHeader title="Мои группы"/>
      <TeacherGroups {...groups}/>
    </StudyShell>;
  }
  const { selected, unavailable } = await studyContext(actor.id, enrollmentId);
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
      <PageHeader title="Главная" />
      {actor.role === "teacher" && selected && <Button variant="outline" asChild>
        <Link href={`/?groupId=${selected.groupId}`}>К группе</Link>
      </Button>}
      {selected ? <StudyContextLabel selected={selected}/> : <NoStudy/>}
      {selected && summary && <div className="dashboard-grid">
        <article><SourceProgress {...summary.sources}/>
          <Button asChild variant="outline"><Link href={studyHref("library", selected.id)}>Открыть источники</Link></Button></article>
        <article><TermProgress {...summary.terms}/>
          <Button asChild variant="outline"><Link href={studyHref("glossary", selected.id)}>Открыть словарь</Link></Button></article>
      </div>}
    </>}
  </StudyShell>;
}
