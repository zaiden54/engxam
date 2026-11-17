import { test,expect,type Page,type BrowserContext } from "@playwright/test";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
type Person={role:string;email:string;password:string;id:string};
test("administration, assigned teacher, student profile and deactivation",async({browser,page},testInfo)=>{
  test.skip(process.env.E2E_STAGE02!=="1","Requires isolated stage02 branch fixtures");test.setTimeout(120000);
  const fixtures=JSON.parse(readFileSync(".env.stage02-fixtures.json","utf8")) as Person[];
  const person=(role:string)=>fixtures.find(p=>p.role===role)!;
  const contexts:BrowserContext[]=[];
  const login=async(p:Page,role:string)=>{await p.goto("/login");await p.getByLabel("Электронная почта").fill(person(role).email);await p.getByLabel("Пароль",{exact:true}).fill(person(role).password);await p.getByRole("button",{name:"Войти",exact:true}).click();await expect(p).toHaveURL(/\/account$/);};
  await login(page,"admin");await expect(page.getByRole("heading",{name:"Управление обучением"})).toBeVisible();
  const command=async(input:unknown)=>{const response=await page.request.post("/api/education",{headers:{Origin:"https://localhost:3000"},data:{key:randomUUID(),command:input}});const result=await response.json();expect(response.ok(),JSON.stringify(result)).toBeTruthy();return result as {id:string};};
  const suffix=randomUUID().slice(0,8);
  const teacher2=await command({operation:"createUser",email:`teacher-${suffix}@example.invalid`,fullName:`Teacher ${suffix}`,role:"teacher"});
  const period=await command({operation:"createPeriod",name:`Поток ${suffix}`,startsOn:"2026-09-01",endsOn:"2027-08-31",preparationDeadline:"2027-04-01"});
  const group=await command({operation:"createGroup",periodId:period.id,name:`Группа ${suffix}`});
  const studentId=person("student").id;
  const enrollment=await command({operation:"enroll",studentId,teacherId:person("teacher").id,groupId:group.id,specialty:"Экономика",language:"en"});
  try{
    const teacherContext=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:390,height:844}});contexts.push(teacherContext);const teacherPage=await teacherContext.newPage();await login(teacherPage,"teacher");await expect(teacherPage.getByRole("heading",{name:"Мои студенты"})).toBeVisible();
    let state=await (await teacherPage.request.get("https://localhost:3000/api/education")).json();expect(state.enrollments.some((e:{id:string})=>e.id===enrollment.id)).toBe(true);
    const studentContext=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:390,height:844}});contexts.push(studentContext);const studentPage=await studentContext.newPage();await login(studentPage,"student");
    const article=studentPage.getByRole("article").filter({hasText:`Группа ${suffix}`});await article.getByLabel("Тема диссертации").fill(`Тема ${suffix}`);await article.getByLabel("Научный руководитель").fill("Научный руководитель");await article.getByRole("button",{name:"Сохранить",exact:true}).click();await expect(article.getByRole("status")).toHaveText("Сохранено");
    const forged=await studentPage.request.post("https://localhost:3000/api/education",{headers:{Origin:"https://localhost:3000"},data:{key:randomUUID(),command:{operation:"createGroup",periodId:period.id,name:"Forbidden"}}});expect(forged.status()).toBe(403);
    const before=await (await page.request.get("/api/education")).json();const current=before.enrollments.find((e:{id:string})=>e.id===enrollment.id);
    await command({operation:"assign",id:enrollment.id,version:current.version,teacherId:teacher2.id,groupId:group.id});state=await(await teacherPage.request.get("https://localhost:3000/api/education")).json();expect(state.enrollments.some((e:{id:string})=>e.id===enrollment.id)).toBe(false);
    const user=before.users.find((u:{id:string})=>u.id===studentId);await command({operation:"updateUser",id:studentId,version:user.version,fullName:user.fullName,role:"student",active:false});expect((await studentPage.request.get("https://localhost:3000/api/session")).status()).toBe(401);
    await page.reload();await page.waitForLoadState("networkidle");await page.screenshot({path:testInfo.outputPath("admin.png"),fullPage:true});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }finally{
    for(const context of contexts)await context.close();
    const state=await(await page.request.get("/api/education")).json();const user=state.users?.find((u:{id:string})=>u.id===studentId);
    if(user&&!user.active)await command({operation:"updateUser",id:studentId,version:user.version,fullName:user.fullName,role:"student",active:true});
  }
});
