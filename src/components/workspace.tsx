"use client";
import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { educationAction } from "@/modules/education/actions";
import type { Workspace as Data } from "@/modules/education/queries";
import type { Command } from "@/modules/education/schemas";
import { PageHeader } from "./ui/page-header";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { Field, FieldLabel } from "./ui/field";
import { InlineDisclosure } from "./ui/inline-disclosure";
import { Input as ControlInput } from "./ui/input";
import { NativeSelect, NativeSelectOption } from "./ui/native-select";
import { Badge } from "./ui/badge";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "./ui/empty";
import { ListPagination } from "./ui/list-pagination";
import { Textarea } from "./ui/textarea";
import { StatusMessage } from "./ui/states";

const roleLabels={admin:"Администратор",teacher:"Преподаватель",student:"Студент"};
function CommandForm({children,build,label="Сохранить"}:{children:React.ReactNode;build:(data:FormData)=>Command;label?:string}){
  const [status, setStatus] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [key,setKey]=useState<string|null>(null);
  const router = useRouter();

  return <form className="stack-form" autoComplete="off" aria-busy={pending} onChange={() => { if (!pending) setKey(null); }}
    onSubmit={async event => {
      event.preventDefault();
      if (pending) return;
      const command = build(new FormData(event.currentTarget));
      const requestKey = key ?? crypto.randomUUID();
      setKey(requestKey);
      setPending(true);
      setStatus(null);
      try {
        const result = await educationAction({ key: requestKey, command });
        if (result.ok) {
          setStatus({ kind: "success", text: "Сохранено" });
          setKey(null);
          router.refresh();
        } else {
          setStatus({ kind: "error", text: result.error.message });
          if (result.error.code !== "UNAVAILABLE") setKey(null);
        }
      } catch {
        setStatus({ kind: "error", text: "Не удалось связаться с сервером. Повторите запрос." });
      } finally {
        setPending(false);
      }
    }}>
    <fieldset disabled={pending}>{children}<Button type="submit">{pending ? "Сохраняем…" : label}</Button></fieldset>
    {status && <StatusMessage kind={status.kind}>{status.text}</StatusMessage>}
  </form>;
}
function Input({name,label,type="text",value,required=true}:{name:string;label:string;type?:string;value?:string;required?:boolean}){
  const id = useId();
  return <Field><FieldLabel htmlFor={id}>{label}</FieldLabel><ControlInput id={id} name={name} type={type} defaultValue={value} required={required} maxLength={type==="text"?200:undefined}/></Field>;
}
const field=(d:FormData,key:string)=>String(d.get(key)??"");
export function Workspace({data,enrollmentId}:{data:Data;enrollmentId?:string}){
  const {actor}=data;
  const pageHref = (page: number) => `/account?${new URLSearchParams({ page: String(page), ...(enrollmentId ? { enrollmentId } : {}) })}#enrollments`;
  const selectUsers=(name:string,role:"teacher"|"student",value?:string)=><label>{role==="teacher"?"Преподаватель":"Студент"}<NativeSelect key={value} name={name} defaultValue={value} required>{value === "" && <NativeSelectOption value="" disabled>Выберите преподавателя</NativeSelectOption>}{data.users.filter(u=>u.active&&u.role===role).map(u=><NativeSelectOption value={u.id} key={u.id}>{u.fullName} — {u.email}</NativeSelectOption>)}</NativeSelect></label>;
  const selectGroups=(value?:string)=><label>Группа<NativeSelect name="groupId" defaultValue={value} required>{!data.groups.some(g=>g.available) && <NativeSelectOption value="">Нет доступных групп</NativeSelectOption>}{data.groups.filter(g=>g.available).map(g=><NativeSelectOption value={g.id} key={g.id}>{g.name} · {g.periodName}</NativeSelectOption>)}</NativeSelect></label>;
  return <><PageHeader title={actor.role==="admin"?"Управление обучением":actor.role==="teacher"?"Мои студенты":"Профиль"} description={<>{actor.fullName}<span className="account-email">{actor.email}</span></>}><Badge variant="secondary">{roleLabels[actor.role]}</Badge></PageHeader><nav className="workspace-tabs" aria-label="Разделы профиля и управления">{actor.role==="admin"&&<><a href="#users">Пользователи</a><a href="#periods">Потоки и группы</a></>}<a href="#enrollments">{actor.role==="student"?"Мой профиль":"Обучение"}</a></nav>
    {actor.role==="admin"&&<>
      <section id="users"><h2>Пользователи</h2><InlineDisclosure className="record-surface" label="Добавить пользователя"><p>Укажите имя, почту и роль. Для первого входа пользователь сможет установить пароль с помощью кода из письма.</p><CommandForm label="Добавить пользователя" build={d=>({operation:"createUser",email:field(d,"email"),fullName:field(d,"fullName"),role:field(d,"role") as "student"})}><Input name="email" label="Email нового пользователя" type="email"/><Input name="fullName" label="ФИО нового пользователя"/><label>Роль<NativeSelect name="role"><NativeSelectOption value="student">Студент</NativeSelectOption><NativeSelectOption value="teacher">Преподаватель</NativeSelectOption><NativeSelectOption value="admin">Администратор</NativeSelectOption></NativeSelect></label></CommandForm></InlineDisclosure>
      <div className="record-list directory-list">{data.users.map(user=><InlineDisclosure key={user.id} triggerClassName="w-full justify-start text-left" label={<span className="directory-summary"><span className="directory-person"><strong>{user.fullName}</strong><span>{user.email}</span></span><span>{roleLabels[user.role]}</span><span>{user.active?"Активен":"Отключён"}</span></span>}><p>{user.email}</p><CommandForm build={d=>({operation:"updateUser",id:user.id,version:user.version,fullName:field(d,"fullName"),role:field(d,"role") as "student",active:d.get("active")==="on"})}><Input name="fullName" label="ФИО" value={user.fullName}/><label>Роль<NativeSelect name="role" defaultValue={user.role}><NativeSelectOption value="student">Студент</NativeSelectOption><NativeSelectOption value="teacher">Преподаватель</NativeSelectOption><NativeSelectOption value="admin">Администратор</NativeSelectOption></NativeSelect></label><label className="checkbox"><Checkbox name="active" value="on" defaultChecked={user.active}/>Доступ активен</label></CommandForm></InlineDisclosure>)}</div></section>
      <section id="periods"><h2>Потоки и группы</h2><div className="form-grid"><InlineDisclosure className="record-surface" label="Создать поток"><CommandForm label="Создать поток" build={d=>({operation:"createPeriod",name:field(d,"name"),startsOn:field(d,"startsOn"),endsOn:field(d,"endsOn"),preparationDeadline:field(d,"deadline")})}><Input name="name" label="Название потока"/><Input name="startsOn" label="Начало" type="date"/><Input name="endsOn" label="Окончание" type="date"/><Input name="deadline" label="Срок подготовки" type="date"/></CommandForm></InlineDisclosure><InlineDisclosure className="record-surface" label="Создать группу"><CommandForm label="Создать группу" build={d=>({operation:"createGroup",periodId:field(d,"periodId"),name:field(d,"name")})}><label>Поток<NativeSelect name="periodId" required>{data.periods.filter(p=>!p.archived).map(p=><NativeSelectOption value={p.id} key={p.id}>{p.name}</NativeSelectOption>)}</NativeSelect></label><Input name="name" label="Номер или название группы"/></CommandForm></InlineDisclosure></div>
      <div className="record-list">{data.periods.map(p=><InlineDisclosure className="record-surface" key={p.id} label={p.archived ? p.name + " · Архив" : p.name}><CommandForm build={d=>({operation:"updatePeriod",id:p.id,version:p.version,name:field(d,"name"),archived:d.get("archived")==="on"})}><Input name="name" label="Название потока" value={p.name}/><label className="checkbox"><Checkbox name="archived" value="on" defaultChecked={p.archived}/>Архивировать поток</label></CommandForm></InlineDisclosure>)}{data.groups.map(g=><InlineDisclosure className="record-surface" key={g.id} label={g.name + " · " + g.periodName + (g.teacherName ? " · " + g.teacherName : "")}><CommandForm build={d=>({operation:"updateGroup",id:g.id,version:g.version,name:field(d,"name")})}><Input name="name" label="Название группы" value={g.name}/></CommandForm><CommandForm label="Назначить преподавателя" build={d=>({operation:"setGroupTeacher",id:g.id,version:g.version,teacherId:field(d,"teacherId")})}>{selectUsers("teacherId","teacher",g.teacherId ?? "")}</CommandForm></InlineDisclosure>)}</div></section>
    </>}
    <section id="enrollments"><h2>{actor.role==="student"?"Профиль обучения":"Учебные назначения"}</h2>{actor.role==="admin"&&<InlineDisclosure className="record-surface" label="Зачислить студента"><CommandForm label="Зачислить" build={d=>({operation:"enroll",studentId:field(d,"studentId"),groupId:field(d,"groupId"),specialty:field(d,"specialty"),language:"en"})}>{selectUsers("studentId","student")}{selectGroups()}<Input name="specialty" label="Специальность"/><p>Изучаемый язык: английский.</p></CommandForm></InlineDisclosure>}
    {!data.enrollments.length&&<Empty><EmptyHeader><EmptyTitle><h3>Обучение пока не назначено</h3></EmptyTitle><EmptyDescription>{actor.role==="admin"?"Создайте группу и закрепите за ней преподавателя.":"Учебное назначение появится после настройки администратором."}</EmptyDescription></EmptyHeader></Empty>}
    <div className="record-list">{data.enrollments.map(e=><article className="record-surface enrollment-record" key={e.id}><div className="enrollment-heading"><h3>{e.studentName}</h3><div className="enrollment-actions">{actor.role!=="admin"&&<Button asChild><Link href={`/library?enrollmentId=${e.id}`}>Источники</Link></Button>}{actor.role!=="admin"&&<Button asChild variant="outline"><Link href={`/glossary?enrollmentId=${e.id}`}>Словарь терминов</Link></Button>}</div></div><dl><dt>Группа и поток</dt><dd>{e.groupName} · {e.periodName}</dd><dt>Преподаватель</dt><dd>{e.teacherName}</dd><dt>Специальность</dt><dd>{e.specialty}</dd><dt>Тема диссертации</dt><dd>{e.dissertationTopic||"Не указана"}</dd><dt>Научный руководитель</dt><dd>{e.supervisorName||"Не указан"}</dd></dl>{actor.role==="student"&&<CommandForm build={d=>({operation:"updateProfile",id:e.id,version:e.version,dissertationTopic:field(d,"topic"),supervisorName:field(d,"supervisor")})}><label>Тема диссертации<Textarea name="topic" defaultValue={e.dissertationTopic} maxLength={5000}/></label><Input name="supervisor" label="Научный руководитель" value={e.supervisorName} required={false}/></CommandForm>}{actor.role==="admin"&&<CommandForm label="Перевести в группу" build={d=>({operation:"assign",id:e.id,version:e.version,groupId:field(d,"groupId")})}>{selectGroups(e.groupId)}</CommandForm>}</article>)}</div></section>
    <ListPagination label="Страницы учебных назначений" page={data.page} previous={data.page>1?pageHref(data.page-1):undefined} next={data.hasNext?pageHref(data.page+1):undefined} />

    {actor.role==="admin"&&<p className="muted">Справочники пользователей, потоков и групп: первые 100 записей. Учебные назначения: по 25 на странице.</p>}
  </>;
}
