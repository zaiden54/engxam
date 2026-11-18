import { notFound } from "next/navigation";
import { GuestShell } from "@/components/site-shell";
import { SourceProgress } from "@/components/study-progress";
import { DialogExample } from "./dialog-example";
import { EmptyState, StatusMessage } from "@/components/ui/states";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Pagination, PaginationContent, PaginationItem, PaginationLink } from "@/components/ui/pagination";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
export default function Preview() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <GuestShell><h1>Компоненты интерфейса</h1><p>Демонстрация состояний, без учебных данных.</p>
    <DialogExample />
    <section className="my-6 grid gap-4" aria-labelledby="preview-fields">
      <h2 id="preview-fields">Поля и состояния</h2>
      <Field><FieldLabel htmlFor="preview-title">Название</FieldLabel><Input id="preview-title" /></Field>
      <Field><FieldLabel htmlFor="preview-note">Заметка</FieldLabel><Textarea id="preview-note" /></Field>
      <Field><FieldLabel htmlFor="preview-filter">Состояние</FieldLabel><NativeSelect id="preview-filter"><NativeSelectOption>Все</NativeSelectOption><NativeSelectOption>В архиве</NativeSelectOption></NativeSelect></Field>
      <Field orientation="horizontal"><Checkbox id="preview-archived" /><Label htmlFor="preview-archived">Показать архивные</Label></Field>
      <Collapsible>
        <CollapsibleTrigger asChild><Button variant="outline" type="button">Показать подробности</Button></CollapsibleTrigger>
        <CollapsibleContent>Дополнительные сведения о записи.</CollapsibleContent>
      </Collapsible>
      <div><Badge variant="secondary">Черновик</Badge></div>
      <Alert variant="destructive"><AlertDescription>Не удалось сохранить запись.</AlertDescription></Alert>
      <Progress value={40} aria-label="Пример прогресса загрузки" />
      <SourceProgress count={0} characters="0" />
      <SourceProgress count={1} characters="600001" />
      <Separator />
      <Empty><EmptyHeader><EmptyTitle>Записей нет</EmptyTitle><EmptyDescription>Добавьте первую запись.</EmptyDescription></EmptyHeader></Empty>
      <Pagination aria-label="Страницы примера"><PaginationContent><PaginationItem><PaginationLink isActive href="#preview-fields">1</PaginationLink></PaginationItem></PaginationContent></Pagination>
    </section>
    <EmptyState title="Пока нет материалов">Добавленные материалы появятся здесь.</EmptyState>
    <StatusMessage kind="success">Изменения сохранены.</StatusMessage><StatusMessage kind="error">Не удалось сохранить изменения. Повторите попытку.</StatusMessage>
    <div className="skeleton" role="status" aria-label="Загрузка списка" />
    <div className="responsive-table"><table><caption>Пример представления списка</caption><thead><tr><th scope="col">Раздел</th><th scope="col">Состояние</th></tr></thead><tbody><tr><td data-label="Раздел">Литература</td><td data-label="Состояние">Пока пусто</td></tr></tbody></table></div>
  </GuestShell>;
}
