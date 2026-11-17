import {test,expect,type Page} from "@playwright/test";
import {readFileSync} from "node:fs";
import {randomUUID} from "node:crypto";
import {PDFDocument} from "pdf-lib";
test("student uploads and revises PDF; assigned teacher reads; admin cannot read",async({page,browser},testInfo)=>{
  test.skip(process.env.E2E_STAGE02!=="1","Requires isolated branch and fixtures");test.setTimeout(120000);
  const people=JSON.parse(readFileSync(".env.stage02-fixtures.json","utf8")) as {role:string;email:string;password:string;id:string}[];
  const person=(role:string)=>people.find(p=>p.role===role)!;
  const login=async(p:Page,role:string)=>{await p.goto("https://localhost:3000/login");await p.getByLabel("Электронная почта").fill(person(role).email);await p.getByLabel("Пароль",{exact:true}).fill(person(role).password);await p.getByRole("button",{name:"Войти",exact:true}).click();await expect(p).toHaveURL(/\/$/);};
  await login(page,"admin");
  const command=async(command:unknown)=>{console.log("Library setup command",(command as {operation:string}).operation);const response=await page.request.post("/api/education",{timeout:15000,headers:{Origin:"https://localhost:3000"},data:{key:randomUUID(),command}});const data=await response.json();expect(response.ok(),JSON.stringify(data)).toBe(true);return data as {id:string};};
  const suffix=randomUUID();const period=await command({operation:"createPeriod",name:`PDF ${suffix}`,startsOn:"2026-09-01",endsOn:"2027-08-31",preparationDeadline:"2027-04-01"});const group=await command({operation:"createGroup",periodId:period.id,name:"PDF group"});const e=await command({operation:"enroll",studentId:person("student").id,teacherId:person("teacher").id,groupId:group.id,specialty:"Economics",language:"en"});
  const studentContext=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:390,height:844}});const teacherContext=await browser.newContext({ignoreHTTPSErrors:true});
  try{
    const student=await studentContext.newPage();student.setDefaultTimeout(10000);await login(student,"student");console.log("Student signed in");await student.goto(`https://localhost:3000/library?enrollmentId=${e.id}`);await expect(student.getByRole("heading",{name:"Источники",exact:true})).toBeVisible();console.log("Library opened");
    const add=student.getByRole("button",{name:"Добавить источник",exact:true});await add.click();const form=student.getByRole("dialog",{name:"Добавить источник"});await expect(form).toBeVisible();
    await form.getByLabel("Название",{exact:true}).fill(`Scientific paper ${suffix}`);await form.getByLabel("Авторы",{exact:true}).fill("Scientific Author");await form.getByLabel("Год публикации").fill("2026");await form.getByLabel("Страницы издания").fill("12–20");await form.getByLabel("Журнал, сборник или издательство").fill("Science Journal");await form.getByLabel("Знаки с пробелами, без сносок и библиографии").fill("42000");
    const pdf=await PDFDocument.create();pdf.addPage();pdf.setTitle(suffix);const bytes=Buffer.from(await pdf.save());await form.getByLabel("PDF-файл до 50 МБ").setInputFiles({name:"science.pdf",mimeType:"application/pdf",buffer:bytes});const submit=form.getByRole("button",{name:"Сохранить источник",exact:true});
    const uploads="**/api/files/uploads";
    await student.route(uploads,route=>route.fulfill({status:503,json:{message:"Загрузка временно недоступна"}}),{times:1});
    await submit.click();await expect(form.getByRole("status")).toHaveText("Загрузка временно недоступна");
    await expect(form.getByLabel("Название",{exact:true})).toHaveValue(`Scientific paper ${suffix}`);
    console.log("Uploading through UI");await submit.click();await expect(form).toBeHidden({timeout:45000});await expect(add).toBeFocused();await expect(student.getByRole("progressbar")).toHaveAttribute("aria-valuetext",/42.000 из 600.000/);
    const card=student.getByRole("article").filter({has:student.getByRole("heading",{name:`Scientific paper ${suffix}`,exact:true})});await expect(card).toBeVisible();const download=await card.getByRole("link",{name:"Скачать PDF"}).getAttribute("href");expect(download).toBeTruthy();
    console.log("Downloading stored PDF");const fileResponse=await student.request.get(`https://localhost:3000${download}`,{timeout:15000});expect(fileResponse.ok()).toBe(true);expect((await fileResponse.body()).equals(bytes)).toBe(true);
    expect((await page.request.get(download!,{maxRedirects:0})).status()).toBe(404);
    console.log("Checking teacher access");const teacher=await teacherContext.newPage();teacher.setDefaultTimeout(10000);await login(teacher,"teacher");await teacher.goto(`https://localhost:3000/library?enrollmentId=${e.id}`);await expect(teacher.getByRole("heading",{name:`Scientific paper ${suffix}`,exact:true})).toBeVisible();await expect(teacher.getByRole("button",{name:"Добавить источник",exact:true})).toHaveCount(0);
    expect((await teacher.request.get(`https://localhost:3000${download}`)).ok()).toBe(true);
    console.log("Revising metadata",await card.locator("summary").allTextContents());await student.screenshot({path:testInfo.outputPath("before-edit.png"),fullPage:true});await card.getByText("Редактировать материал",{exact:true}).click({timeout:8000});await card.getByLabel("Название",{exact:true}).fill(`Revised ${suffix}`);await card.getByRole("button",{name:"Сохранить новую ревизию"}).click();await expect(student.getByRole("heading",{name:`Revised ${suffix}`,exact:true})).toBeVisible();
    const revised=student.getByRole("article").filter({has:student.getByRole("heading",{name:`Revised ${suffix}`,exact:true})});await revised.getByText("История ревизий",{exact:true}).click();await expect(revised.getByText(/Ревизия 1 · Scientific paper/)).toBeVisible();
    await student.waitForLoadState("networkidle",{timeout:15000});await student.screenshot({path:testInfo.outputPath("library.png"),fullPage:true});expect(await student.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await revised.getByRole("button",{name:"В архив",exact:true}).click();await expect(student.getByRole("heading",{name:`Revised ${suffix}`,exact:true})).toHaveCount(0);await expect(student.getByRole("progressbar")).toHaveAttribute("value","0");
    await student.getByLabel("Состояние",{exact:true}).selectOption("1");await student.getByRole("button",{name:"Найти",exact:true}).click();await expect(student.getByRole("heading",{name:`Revised ${suffix}`,exact:true})).toBeVisible();
  }catch(error){console.error("Library browser scenario failed",error instanceof Error?error.message:"unknown error");throw error;}
  finally{await Promise.race([Promise.all([studentContext.close().catch(()=>{}),teacherContext.close().catch(()=>{})]),new Promise(resolve=>setTimeout(resolve,5000))]);}
});
