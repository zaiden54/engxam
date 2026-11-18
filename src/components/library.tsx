"use client";
import Form from "next/form";
import {useRef,useState} from "react";
import {useRouter} from "next/navigation";
import {PageHeader} from "./ui/page-header";
import {SourceProgress} from "./study-progress";
import {SourceDialog as Dialog,useDialog} from "./source-dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { NativeSelect, NativeSelectOption } from "./ui/native-select";
import { InlineDisclosure } from "./ui/inline-disclosure";
import { ListPagination } from "./ui/list-pagination";
import { EmptyState } from "./ui/states";
import { Progress } from "./ui/progress";
import type {MetadataInput} from "@/modules/literature/schemas";
export type LibraryItem=MetadataInput&{id:string;version:number;revisionNo:number;pageCount:number;originalName:string;archivedAt:string|null;fileLockedAt:string|null;pendingDefenseCount:number};
export type LibraryData={enrollmentId:string;canEdit:boolean;items:LibraryItem[];page:number;hasNext:boolean;totals:{characters:string;count:number}};
async function api<T>(path:string,method:string,data?:unknown):Promise<T>{let response:Response;try{response=await fetch(path,{method,headers:data?{"Content-Type":"application/json"}:{},body:data?JSON.stringify(data):undefined,signal:AbortSignal.timeout(90000)});}catch{throw Error("Сервер не ответил. Проверьте соединение и повторите запрос.");}const result=await response.json().catch(()=>null);if(!response.ok||!result)throw Error(result?.message??"Не удалось выполнить действие. Повторите попытку.");return result;}
function LiteratureForm({enrollmentId,item,onSaved,onBusyChange}:{enrollmentId:string;item?:LibraryItem;onSaved?:(message:string)=>void;onBusyChange?:(busy:boolean)=>void}){
  const [message,setMessage]=useState("");const [busy,setBusy]=useState(false);const [progress,setProgress]=useState<number|null>(null);const [readyFile,setReadyFile]=useState<string|null>(item?.fileId??null);
  const upload=useRef<{file:File;id?:string;key:string}|null>(null);const saveKey=useRef<string|null>(null);const cancel=useRef<XMLHttpRequest|null>(null);const router=useRouter();
  return <form className="stack-form" autoComplete="off" aria-busy={busy} onChange={()=>{saveKey.current=null;}} onSubmit={async event=>{
    event.preventDefault();if(busy)return;const form=event.currentTarget;const values=new FormData(form);setBusy(true);onBusyChange?.(true);setMessage("");
    try{
      let fileId=readyFile;const chosen=values.get("pdf");
      if(chosen instanceof File&&chosen.size){
        if(chosen.size>50*1024*1024)throw Error("PDF превышает 50 МБ.");
        if(!upload.current||upload.current.file.name!==chosen.name||upload.current.file.size!==chosen.size||upload.current.file.lastModified!==chosen.lastModified){upload.current={file:chosen,key:crypto.randomUUID()};fileId=null;}
        if(!fileId){
          setMessage("Подготавливаем загрузку…");
          const signed=await api<{id:string;url:string|null;status:string;headers:Record<string,string>}>("/api/files/uploads","POST",{key:upload.current.key,enrollmentId,name:chosen.name,size:chosen.size});upload.current.id=signed.id;
          if(signed.status!=="ready"&&signed.url){
            setMessage("Загружаем PDF…");setProgress(0);
            await new Promise<void>((resolve,reject)=>{const xhr=new XMLHttpRequest();cancel.current=xhr;xhr.open("PUT",signed.url!);for(const [key,value]of Object.entries(signed.headers))xhr.setRequestHeader(key,value);xhr.upload.onprogress=e=>{if(e.lengthComputable)setProgress(Math.round(e.loaded/e.total*100));};xhr.onload=()=>xhr.status>=200&&xhr.status<300||xhr.status===412?resolve():reject(Error("Хранилище не приняло файл. Повторите загрузку."));xhr.onerror=()=>reject(Error("Соединение прервано. Повторите загрузку."));xhr.onabort=()=>reject(Error("Загрузка отменена. Можно повторить."));xhr.send(chosen);});
          }
          setProgress(null);setMessage("Проверяем PDF…");const finished=await api<{id:string}>(`/api/files/${signed.id}/complete`,"POST");fileId=finished.id;setReadyFile(fileId);
        }
      }
      if(!fileId)throw Error("Выберите PDF.");
      const s=(name:string)=>String(values.get(name)??"");
      const metadata:MetadataInput={title:s("title"),authors:s("authors"),materialType:s("materialType") as MetadataInput["materialType"],publicationYear:Number(s("publicationYear")),publicationSource:s("publicationSource"),doi:s("doi"),url:s("url"),publicationPages:s("publicationPages"),declaredCharacters:Number(s("declaredCharacters")),declaredWords:s("declaredWords")?Number(s("declaredWords")):null,fileId};
      saveKey.current??=crypto.randomUUID();const result=await api<{id:string;warning:string|null}>("/api/literature","POST",{key:saveKey.current,enrollmentId,...(item?{id:item.id,version:item.version}:{}),metadata});
      saveKey.current=null;const notice=result.warning??"Источник сохранён. Загрузка не означает зачёт объёма.";setMessage(notice);
      if(!item){form.reset();setReadyFile(null);upload.current=null;}onSaved?.(notice);router.refresh();
    }catch(e){setProgress(null);setMessage(e instanceof Error?e.message:"Не удалось сохранить материал.");}finally{setBusy(false);onBusyChange?.(false);cancel.current=null;}
  }}><fieldset disabled={busy}>
    <label>Название<Input name="title" defaultValue={item?.title} required maxLength={1000}/></label>
    <label>Авторы<Input name="authors" defaultValue={item?.authors} required maxLength={2000}/></label>
    <label>Тип материала<NativeSelect name="materialType" defaultValue={item?.materialType??"article"}><NativeSelectOption value="article">Научная статья</NativeSelectOption><NativeSelectOption value="monograph">Монография</NativeSelectOption><NativeSelectOption value="collection">Сборник</NativeSelectOption></NativeSelect></label>
    <div className="form-grid"><label>Год публикации<Input type="number" name="publicationYear" defaultValue={item?.publicationYear} required min={1500} max={new Date().getFullYear()+1}/></label><label>Страницы издания<Input name="publicationPages" defaultValue={item?.publicationPages} required placeholder="Например: 12–28" maxLength={300}/></label></div>
    <label>Журнал, сборник или издательство<Input name="publicationSource" defaultValue={item?.publicationSource} required maxLength={2000}/></label>
    <label>DOI (если есть)<Input name="doi" defaultValue={item?.doi??""} maxLength={500}/></label><label>Ссылка на публикацию<Input name="url" type="url" defaultValue={item?.url??""}/></label>
    <label>Знаки с пробелами, без сносок и библиографии<Input type="number" name="declaredCharacters" defaultValue={item?.declaredCharacters} min={1} max={2147483647} required/></label><label>Количество слов (необязательно)<Input type="number" name="declaredWords" defaultValue={item?.declaredWords??""} min={0} max={2147483647}/></label>
    <label>{item?"Заменить PDF (необязательно)":"PDF-файл до 50 МБ"}<Input type="file" name="pdf" accept="application/pdf,.pdf" required={!item&&!readyFile} disabled={!!item&&(!!item.fileLockedAt||item.pendingDefenseCount>0)} onChange={()=>{setReadyFile(null);upload.current=null;}}/></label>
    {item&&(item.fileLockedAt||item.pendingDefenseCount>0)&&<p>PDF зафиксирован зачётом или открытой защитой. Метаданные можно исправить.</p>}
    <Button type="submit">{busy?"Сохраняем…":item?"Сохранить новую ревизию":"Сохранить источник"}</Button>
  </fieldset>{busy&&progress!==null&&<div className="grid gap-2">
    <Progress className="h-2" value={progress} aria-label="Загрузка PDF" />
    <Button variant="outline" type="button" onClick={()=>cancel.current?.abort()}>Отменить загрузку</Button>
  </div>}<p role="status" aria-live="polite">{message}</p></form>;
}
function MaterialCard({item,enrollmentId,canEdit}:{item:LibraryItem;enrollmentId:string;canEdit:boolean}){
  const [status,setStatus]=useState("");const [busy,setBusy]=useState(false);const [preview,setPreview]=useState(false);const [revisions,setRevisions]=useState<{id:string;revisionNo:number;title:string;fileId:string;declaredCharacters:number;createdAt:string}[]|null>(null);const router=useRouter();
  return <article className="record-surface material-card"><p className="eyebrow">{item.materialType==="article"?"Статья":item.materialType==="monograph"?"Монография":"Сборник"} · Ревизия {item.revisionNo}{item.archivedAt?" · Архив":""}</p><h2>{item.title}</h2><p>{item.authors} · {item.publicationYear}</p><dl><dt>Источник</dt><dd>{item.publicationSource}, {item.publicationPages}</dd><dt>Заявленный объём</dt><dd>{item.declaredCharacters.toLocaleString("ru-RU")} знаков{item.declaredWords!==null?`, ${item.declaredWords} слов`:""}</dd><dt>PDF</dt><dd>{item.originalName} · {item.pageCount} стр.</dd>{item.doi&&<><dt>DOI</dt><dd>{item.doi}</dd></>}</dl>
    <div className="workspace-tabs">
      <Button asChild><a href={`/api/files/${item.fileId}/download?inline=1`} target="_blank" rel="noopener noreferrer">Открыть PDF</a></Button>
      <Button asChild variant="outline"><a href={`/api/files/${item.fileId}/download`}>Скачать PDF</a></Button>
      <Button type="button" variant="outline" aria-expanded={preview} onClick={()=>setPreview(!preview)}>{preview?"Скрыть просмотр":"Просмотр на странице"}</Button>
    </div>
    {preview&&<div className="pdf-preview"><iframe title={`PDF: ${item.title}`} src={`/api/files/${item.fileId}/download?inline=1`} sandbox="allow-scripts allow-same-origin" referrerPolicy="no-referrer"/><p>Если просмотр недоступен на вашем устройстве, используйте «Открыть PDF» или «Скачать PDF».</p></div>}
    <InlineDisclosure label="История ревизий" onOpenChange={async open=>{if(open&&!revisions){try{setRevisions(await api(`/api/literature?history=${item.id}`,"GET"));}catch(e){setStatus((e as Error).message);}}}}>
      {revisions?revisions.map(r=><p key={r.id}>Ревизия {r.revisionNo} · {r.title} · {r.declaredCharacters} знаков · <a href={`/api/files/${r.fileId}/download?inline=1`} target="_blank" rel="noopener noreferrer">PDF этой версии</a></p>):<p>Загружаем историю…</p>}
    </InlineDisclosure>
    {canEdit&&!item.archivedAt&&<InlineDisclosure label="Редактировать материал"><LiteratureForm enrollmentId={enrollmentId} item={item}/></InlineDisclosure>}
    {canEdit&&<Button variant="outline" type="button" disabled={busy} onClick={async()=>{setBusy(true);setStatus("");try{await api("/api/literature","PATCH",{key:crypto.randomUUID(),id:item.id,version:item.version,archive:!item.archivedAt});router.refresh();}catch(e){setStatus((e as Error).message);}finally{setBusy(false);}}}>{item.archivedAt?"Восстановить материал":"В архив"}</Button>}<p role="status">{status}</p>
  </article>;
}
function NewSourceForm({enrollmentId,onSaved}:{enrollmentId:string;onSaved:(message:string)=>void}){
  const {close,setBusy}=useDialog();
  return <LiteratureForm enrollmentId={enrollmentId} onBusyChange={setBusy} onSaved={message=>{onSaved(message);close();}}/>;
}

export function Library({data,filters}:{data:LibraryData;filters:{q:string;type:string;archived:boolean}}){
  const [saved,setSaved]=useState("");
  const path=(page:number)=>`/library?${new URLSearchParams({enrollmentId:data.enrollmentId,q:filters.q,type:filters.type,archived:filters.archived?"1":"0",page:String(page)})}`;
  return <><PageHeader title="Источники" description="Научные публикации и PDF по вашему исследованию."/>
    <SourceProgress {...data.totals}/>
    {data.canEdit&&<div className="source-actions">
      <Dialog trigger="Добавить источник" title="Добавить источник">
        <NewSourceForm enrollmentId={data.enrollmentId} onSaved={setSaved}/>
      </Dialog>
      <p role="status">{saved}</p>
    </div>}
    <Form key={JSON.stringify(filters)} className="library-filters" autoComplete="off" action="/library"><input type="hidden" name="enrollmentId" value={data.enrollmentId}/><label>Поиск по названию и авторам<Input type="search" name="q" defaultValue={filters.q} maxLength={200} placeholder="Название или автор…"/></label><label>Тип<NativeSelect name="type" defaultValue={filters.type}><NativeSelectOption value="">Все типы</NativeSelectOption><NativeSelectOption value="article">Статьи</NativeSelectOption><NativeSelectOption value="monograph">Монографии</NativeSelectOption><NativeSelectOption value="collection">Сборники</NativeSelectOption></NativeSelect></label><label>Состояние<NativeSelect aria-label="Состояние" name="archived" defaultValue={filters.archived?"1":"0"}><NativeSelectOption value="0">Текущие материалы</NativeSelectOption><NativeSelectOption value="1">Архив</NativeSelectOption></NativeSelect></label><Button type="submit">Найти</Button>{(filters.q||filters.type||filters.archived)&&<Button asChild variant="outline"><a href={`/library?enrollmentId=${data.enrollmentId}`}>Сбросить</a></Button>}</Form>
    {!data.items.length&&<EmptyState title={filters.q||filters.type||filters.archived?"Материалы не найдены":"Материалов пока нет"}>{filters.q||filters.type||filters.archived?"Попробуйте другой запрос.":data.canEdit?"Добавьте научную работу и загрузите PDF.":"Здесь появятся материалы студента."}</EmptyState>}
    <div className="record-list">{data.items.map(item=><MaterialCard key={`${item.id}-${item.version}`} item={item} enrollmentId={data.enrollmentId} canEdit={data.canEdit}/>)}</div>
    <ListPagination label="Страницы библиотеки" page={data.page} previous={data.page>1?path(data.page-1):undefined} next={data.hasNext?path(data.page+1):undefined} />
  </>;
}
