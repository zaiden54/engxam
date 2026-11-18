import Link from "next/link";
import type { StudyChoice } from "@/modules/education/study-selection";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { EmptyState } from "@/components/ui/states";

export function StudySelection({ choices, selected, action }: {
  choices: StudyChoice[]; selected?: StudyChoice; action: string;
}) {
  return <section className="study-context" aria-label="Учебное назначение">
    {selected && <p><strong>{selected.student}</strong><span>{selected.group} · {selected.period}</span></p>}
    {choices.length > 1 && <form action={action} className="study-picker">
      <Field>
        <FieldLabel htmlFor="study-enrollment">Учебное назначение</FieldLabel>
        <NativeSelect id="study-enrollment" name="enrollmentId" defaultValue={selected?.id ?? ""} required>
          <NativeSelectOption value="" disabled>Выберите назначение</NativeSelectOption>
          {choices.map(choice => <NativeSelectOption key={choice.id} value={choice.id}>
            {choice.student} · {choice.group} · {choice.period}
          </NativeSelectOption>)}
        </NativeSelect>
      </Field>
      <Button type="submit" variant="outline">Открыть</Button>
    </form>}
  </section>;
}

export function StudyUnavailable() {
  return <section className="record-surface"><h1>Учебное назначение недоступно</h1>
    <p>Выберите доступное назначение на главной.</p><Button asChild><Link href="/">На главную</Link></Button>
  </section>;
}

export function NoStudy() {
  return <EmptyState title="Обучение пока не назначено">Учебное назначение появится после настройки администратором.</EmptyState>;
}
