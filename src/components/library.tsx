"use client";
import {useRef,useState} from "react";
import {useRouter} from "next/navigation";
import {PageHeader} from "./ui/page-header";
import type {MetadataInput} from "@/modules/literature/schemas";
export type LibraryItem=MetadataInput&{id:string;version:number;revisionNo:number;pageCount:number;originalName:string;archivedAt:string|null;fileLockedAt:string|null;pendingDefenseCount:number};
export type LibraryData={enrollmentId:string;canEdit:boolean;items:LibraryItem[];page:number;hasNext:boolean;totals:{characters:string;count:number}};
async function api<T>(path:string,method:string,data?:unknown):Promise<T>{let response:Response;try{response=await fetch(path,{method,headers:data?{"Content-Type":"application/json"}:{},body:data?JSON.stringify(data):undefined,signal:AbortSignal.timeout(90000)});}catch{throw Error("Сервер не ответил. Проверьте соединение и повторите запрос.");}const result=await response.json().catch(()=>null);if(!response.ok||!result)throw Error(result?.message??"Не удалось выполнить действие. Повторите попытку.");return result;}
function LiteratureForm({enrollmentId,item}:{enrollmentId:string;item?:LibraryItem}){
  const [message,setMessage]=useState("");const [busy,setBusy]=useState(false);const [progress,setProgress]=useState<number|null>(null);const [readyFile,setReadyFile]=useState<string|null>(item?.fileId??null);
  const upload=useRef<{file:File;id?:string;key:string}|null>(null);const saveKey=useRef<string|null>(null);const cancel=useRef<XMLHttpRequest|null>(null);const router=useRouter();
  return <form className="stack-form" autoComplete="off" aria-busy={busy} onChange={()=>{saveKey.current=null;}} onSubmit={async event=>{
    event.preventDefault();const form=event.currentTarget;const values=new FormData(form);setBusy(true);setMessage("");
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
      saveKey.current=null;setMessage(result.warning??"Материал сохранён. Загрузка не означает зачёт объёма.");
      if(!item){form.reset();setReadyFile(null);upload.current=null;}router.refresh();
    }catch(e){setProgress(null);setMessage(e instanceof Error?e.message:"Не удалось сохранить материал.");}finally{setBusy(false);cancel.current=null;}
  }}><fieldset disabled={busy}>
    <label>Название<input name="title" defaultValue={item?.title} required maxLength={1000}/></label>
    <label>Авторы<input name="authors" defaultValue={item?.authors} required maxLength={2000}/></label>
    <label>Тип материала<select name="materialType" defaultValue={item?.materialType??"article"}><option value="article">Научная статья</option><option value="monograph">Монография</option><option value="collection">Сборник</option></select></label>
    <div className="form-grid"><label>Год публикации<input type="number" name="publicationYear" defaultValue={item?.publicationYear} required min={1500} max={new Date().getFullYear()+1}/></label><label>Страницы издания<input name="publicationPages" defaultValue={item?.publicationPages} required placeholder="Например: 12–28" maxLength={300}/></label></div>
    <label>Журнал, сборник или издательство<input name="publicationSource" defaultValue={item?.publicationSource} required maxLength={2000}/></label>
    <label>DOI (если есть)<input name="doi" defaultValue={item?.doi??""} maxLength={500}/></label><label>Ссылка на публикацию<input name="url" type="url" defaultValue={item?.url??""}/></label>
    <label>Знаки с пробелами, без сносок и библиографии<input type="number" name="declaredCharacters" defaultValue={item?.declaredCharacters} min={1} max={2147483647} required/></label><label>Количество слов (необязательно)<input type="number" name="declaredWords" defaultValue={item?.declaredWords??""} min={0} max={2147483647}/></label>
    <label>{item?"Заменить PDF (необязательно)":"PDF-файл до 50 МБ"}<input type="file" name="pdf" accept="application/pdf,.pdf" required={!item&&!readyFile} disabled={!!item&&(!!item.fileLockedAt||item.pendingDefenseCount>0)} onChange={()=>{setReadyFile(null);upload.current=null;}}/></label>
    {item&&(item.fileLockedAt||item.pendingDefenseCount>0)&&<p>PDF зафиксирован зачётом или открытой защитой. Метаданные можно исправить.</p>}
    <button className="button primary" type="submit">{busy?"Сохраняем…":item?"Сохранить новую ревизию":"Добавить материал"}</button>
  </fieldset>{busy&&progress!==null&&<><progress value={progress} max={100} aria-label="Загрузка PDF"/><button className="button" type="button" onClick={()=>cancel.current?.abort()}>Отменить загрузку</button></>}<p role="status" aria-live="polite">{message}</p></form>;
}
function MaterialCard({item,enrollmentId,canEdit}:{item:LibraryItem;enrollmentId:string;canEdit:boolean}){
  const [status,setStatus]=useState("");const [busy,setBusy]=useState(false);const [preview,setPreview]=useState(false);const [revisions,setRevisions]=useState<{id:string;revisionNo:number;title:string;fileId:string;declaredCharacters:number;createdAt:string}[]|null>(null);const router=useRouter();
  return <article className="card material-card"><p className="eyebrow">{item.materialType==="article"?"Статья":item.materialType==="monograph"?"Монография":"Сборник"} · Ревизия {item.revisionNo}{item.archivedAt?" · Архив":""}</p><h2>{item.title}</h2><p>{item.authors} · {item.publicationYear}</p><dl><dt>Источник</dt><dd>{item.publicationSource}, {item.publicationPages}</dd><dt>Заявленный объём</dt><dd>{item.declaredCharacters.toLocaleString("ru-RU")} знаков{item.declaredWords!==null?`, ${item.declaredWords} слов`:""}</dd><dt>PDF</dt><dd>{item.originalName} · {item.pageCount} стр.</dd>{item.doi&&<><dt>DOI</dt><dd>{item.doi}</dd></>}</dl>
    <div className="workspace-tabs"><a className="button primary" href={`/api/files/${item.fileId}/download?inline=1`} target="_blank" rel="noopener noreferrer">Открыть PDF</a><a className="button" href={`/api/files/${item.fileId}/download`}>Скачать PDF</a><button className="button" onClick={()=>setPreview(!preview)}>{preview?"Скрыть просмотр":"Просмотр на странице"}</button></div>
    {preview&&<div className="pdf-preview"><iframe title={`PDF: ${item.title}`} src={`/api/files/${item.fileId}/download?inline=1`} sandbox="allow-scripts allow-same-origin" referrerPolicy="no-referrer"/><p>Если просмотр недоступен на вашем устройстве, используйте «Открыть PDF» или «Скачать PDF».</p></div>}
    <details onToggle={async event=>{if(event.currentTarget.open&&!revisions){try{setRevisions(await api(`/api/literature?history=${item.id}`,"GET"));}catch(e){setStatus((e as Error).message);}}}}><summary>История ревизий</summary>{revisions?revisions.map(r=><p key={r.id}>Ревизия {r.revisionNo} · {r.title} · {r.declaredCharacters} знаков · <a href={`/api/files/${r.fileId}/download?inline=1`} target="_blank" rel="noopener noreferrer">PDF этой версии</a></p>):<p>Загружаем историю…</p>}</details>
    {canEdit&&!item.archivedAt&&<details><summary>Редактировать материал</summary><LiteratureForm enrollmentId={enrollmentId} item={item}/></details>}
    {canEdit&&<button className="button" disabled={busy} onClick={async()=>{setBusy(true);setStatus("");try{await api("/api/literature","PATCH",{key:crypto.randomUUID(),id:item.id,version:item.version,archive:!item.archivedAt});router.refresh();}catch(e){setStatus((e as Error).message);}finally{setBusy(false);}}}>{item.archivedAt?"Восстановить материал":"В архив"}</button>}<p role="status">{status}</p>
  </article>;
}
export function Library({data,filters}:{data:LibraryData;filters:{q:string;type:string;archived:boolean}}){
  const path=(page:number)=>`/library?${new URLSearchParams({enrollmentId:data.enrollmentId,q:filters.q,type:filters.type,archived:filters.archived?"1":"0",page:String(page)})}`;
  return <><PageHeader title="Библиотека литературы" description="Научные источники и PDF по вашему исследованию. Заявленный объём подтверждает преподаватель."><h2>Материалов: {data.totals.count.toLocaleString("ru-RU")}</h2><p>{Number(data.totals.characters).toLocaleString("ru-RU")} знаков заявлено</p></PageHeader>
    {data.canEdit&&<details className="card composer"><summary>Добавить материал</summary><LiteratureForm enrollmentId={data.enrollmentId}/></details>}
    <form className="library-filters" autoComplete="off" action="/library"><input type="hidden" name="enrollmentId" value={data.enrollmentId}/><label>Поиск по названию и авторам<input type="search" name="q" defaultValue={filters.q} maxLength={200} placeholder="Название или автор…"/></label><label>Тип<select name="type" defaultValue={filters.type}><option value="">Все типы</option><option value="article">Статьи</option><option value="monograph">Монографии</option><option value="collection">Сборники</option></select></label><label>Состояние<select aria-label="Состояние" name="archived" defaultValue={filters.archived?"1":"0"}><option value="0">Текущие материалы</option><option value="1">Архив</option></select></label><button className="button primary">Найти</button>{(filters.q||filters.type||filters.archived)&&<a className="button" href={`/library?enrollmentId=${data.enrollmentId}`}>Сбросить</a>}</form>
    {!data.items.length&&<div className="card"><h2>{filters.q||filters.type||filters.archived?"Материалы не найдены":"Материалов пока нет"}</h2><p>{filters.q||filters.type||filters.archived?"Попробуйте другой запрос.":data.canEdit?"Добавьте научную работу и загрузите PDF.":"Здесь появятся материалы студента."}</p></div>}
    <div className="record-list">{data.items.map(item=><MaterialCard key={`${item.id}-${item.version}`} item={item} enrollmentId={data.enrollmentId} canEdit={data.canEdit}/>)}</div><nav className="workspace-tabs" aria-label="Страницы библиотеки">{data.page>1&&<a href={path(data.page-1)}>Предыдущая страница</a>}<span>Страница {data.page}</span>{data.hasNext&&<a href={path(data.page+1)}>Следующая страница</a>}</nav>
  </>;
}
