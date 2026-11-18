import Link from "next/link";
import type { StudyChoice } from "@/modules/education/study-selection";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import type { teacherGroups } from "@/modules/education/study-context";
import { studyHref } from "./site-shell";

export function StudyContextLabel({ selected }: { selected: StudyChoice }) {
  return <section className="study-context" aria-label="Учебное назначение">
    <p><strong>{selected.student}</strong><span>{selected.group} · {selected.period}</span></p>
  </section>;
}

export function TeacherGroups({ groups, selected, unavailable }: Awaited<ReturnType<typeof teacherGroups>>) {
  if (unavailable) return <EmptyState title="Группа недоступна">
    <Button variant="outline" asChild><Link href="/">К моим группам</Link></Button>
  </EmptyState>;
  if (!groups.length) return <EmptyState title="Группы пока не назначены">
    Группы появятся после назначения администратором.
  </EmptyState>;
  if (selected) return <section aria-labelledby="group-students">
    <Button variant="outline" asChild><Link href="/">Все группы</Link></Button>
    <h2 id="group-students">{selected.name} · {selected.period}</h2>
    {selected.students.length ? <ul className="record-list">
      {selected.students.map(student => <li key={student.id}>
        <Link className="record-surface group-directory-link" href={studyHref("home", student.id)}>{student.name}</Link>
      </li>)}
    </ul> : <EmptyState title="В группе пока нет студентов">Студенты появятся после зачисления.</EmptyState>}
  </section>;
  return <ul className="record-list" aria-label="Мои группы">
    {groups.map(group => <li key={group.id}>
      <Link className="record-surface group-directory-link" href={`/?groupId=${group.id}`}>
        <strong>{group.name}</strong><span>{group.period}</span>
      </Link>
    </li>)}
  </ul>;
}

export function StudyUnavailable() {
  return <section className="record-surface"><h1>Учебное назначение недоступно</h1>
    <p>Выберите доступное назначение на главной.</p><Button asChild><Link href="/">На главную</Link></Button>
  </section>;
}

export function NoStudy() {
  return <EmptyState title="Обучение пока не назначено">Учебное назначение появится после настройки администратором.</EmptyState>;
}

export function SelectGroup() {
  return <EmptyState title="Выберите студента">
    <Button variant="outline" asChild><Link href="/">Открыть мои группы</Link></Button>
  </EmptyState>;
}
