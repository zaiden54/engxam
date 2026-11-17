import Link from "next/link";
import type { StudyChoice } from "@/modules/education/study-selection";

export function StudySelection({ choices, selected, action }: {
  choices: StudyChoice[]; selected?: StudyChoice; action: string;
}) {
  return <section className="study-context" aria-label="Учебное назначение">
    {selected && <p><strong>{selected.student}</strong><span>{selected.group} · {selected.period}</span></p>}
    {choices.length > 1 && <form action={action} className="study-picker">
      <label>Учебное назначение
        <select name="enrollmentId" defaultValue={selected?.id ?? ""} required>
          <option value="" disabled>Выберите назначение</option>
          {choices.map(choice => <option key={choice.id} value={choice.id}>
            {choice.student} · {choice.group} · {choice.period}
          </option>)}
        </select>
      </label>
      <button className="button">Открыть</button>
    </form>}
  </section>;
}

export function StudyUnavailable() {
  return <section className="card"><h1>Учебное назначение недоступно</h1>
    <p>Выберите доступное назначение на главной.</p><Link className="button primary" href="/">На главную</Link>
  </section>;
}

export function NoStudy() {
  return <section className="card"><h2>Обучение пока не назначено</h2>
    <p>Учебное назначение появится после настройки администратором.</p>
  </section>;
}
