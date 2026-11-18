import {expect,type Page,type BrowserContext } from "@playwright/test";
import { test } from "./study-fixtures";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { blockExternalFontRequests } from "./test-fonts";
type Person={role:string;email:string;password:string;id:string};

test("preparation progress shows the actual volume and caps the indicator", async ({ page }) => {
  await blockExternalFontRequests(page);
  await page.goto("/ui-preview", { waitUntil: "domcontentloaded" });
  const bars = page.getByRole("progressbar", { name: "Заявленный объём источников" });
  await expect(bars).toHaveCount(2);
  await expect(bars.nth(0)).toHaveAttribute("aria-valuenow", "0");
  await expect(bars.nth(1)).toHaveAttribute("aria-valuenow", "600000");
  await expect(bars.nth(1)).toHaveAttribute("aria-valuetext", /^600\s001 из 600\s000 знаков$/);
  await expect(page.getByText("Для зачёта объём подтверждает преподаватель.", { exact: false })).toHaveCount(2);
});

test("administration, assigned teacher, student profile and deactivation", { tag: "@stage02" },async({browser,page,cleanStudentMembership},testInfo)=>{
  test.setTimeout(120000);page.setDefaultTimeout(15000);
  const fixtures=JSON.parse(readFileSync(".env.stage02-fixtures.json","utf8")) as Person[];
  const person=(role:string)=>fixtures.find(p=>p.role===role)!;
  const contexts:BrowserContext[]=[];
  const login=async(p:Page,role:string)=>{p.setDefaultTimeout(15000);await blockExternalFontRequests(p);await p.goto("https://localhost:3000/login",{waitUntil:"domcontentloaded"});await p.getByLabel("Электронная почта").fill(person(role).email);await p.getByLabel("Пароль",{exact:true}).fill(person(role).password);await p.getByRole("button",{name:"Войти",exact:true}).click();await expect(p).toHaveURL(/\/$/);};
  await login(page,"admin");await expect(page.getByRole("progressbar")).toHaveCount(0);await page.getByRole("link",{name:"Управление",exact:true}).click();await expect(page.getByRole("heading",{name:"Управление обучением"})).toBeVisible();
  const command=async(input:unknown)=>{const response=await page.request.post("/api/education",{headers:{Origin:"https://localhost:3000"},data:{key:randomUUID(),command:input}});const result=await response.json();expect(response.ok(),JSON.stringify(result)).toBeTruthy();return result as {id:string};};
  const suffix=randomUUID().slice(0,8);
  const newTeacherEmail = `teacher-${suffix}@example.invalid`;
  await page.getByRole("button", { name: "Добавить пользователя", exact: true }).click();
  const newUserForm = page.locator("form").filter({ has: page.getByLabel("Email нового пользователя") });
  await newUserForm.getByLabel("Email нового пользователя").fill(newTeacherEmail);
  await newUserForm.getByLabel("ФИО нового пользователя").fill(`Teacher ${suffix}`);
  await newUserForm.getByLabel("Роль").selectOption("teacher");
  await newUserForm.getByRole("button", { name: "Добавить пользователя" }).click();
  await expect(newUserForm.getByRole("status")).toHaveText("Сохранено");
  const users: { id: string; email: string }[] = (await (await page.request.get("/api/education")).json()).users;
  const teacher2 = users.find(user => user.email === newTeacherEmail)!;
  expect(teacher2).toBeDefined();
  const period=await command({operation:"createPeriod",name:`Поток ${suffix}`,startsOn:"2026-09-01",endsOn:"2027-08-31",preparationDeadline:"2027-04-01"});
  const group=await command({operation:"createGroup",periodId:period.id,name:`Группа ${suffix}`,teacherId:person("teacher").id});
  const nextPeriod = await command({ operation: "createPeriod", name: `Другой поток ${suffix}`, startsOn: "2026-09-01", endsOn: "2027-08-31", preparationDeadline: "2027-04-01" });
  const economics = await command({ operation: "createGroup", periodId: nextPeriod.id, name: `Экономика ${suffix}`, teacherId: person("teacher").id });
  const systems = await command({ operation: "createGroup", periodId: period.id, name: `Системный анализ ${suffix}` });
  await command({ operation: "setGroupTeacher", id: systems.id, version: 1, teacherId: person("teacher").id });
  const studentId=cleanStudentMembership;
  const studentContext=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:390,height:844}});contexts.push(studentContext);
  const studentPage=await studentContext.newPage();
  await login(studentPage,"student");
  await expect(studentPage.getByRole("heading", { name: "Обучение пока не назначено" })).toBeVisible();
  const enrollment=await command({operation:"enroll",studentId,groupId:group.id,specialty:"Экономика",language:"en"});
  const duplicate = await page.request.post("/api/education", { headers: { Origin: "https://localhost:3000" }, data: {
    key: randomUUID(), command: { operation: "enroll", studentId, groupId: economics.id, specialty: "Экономика", language: "en" },
  } });
  expect(duplicate.status()).toBe(409);
  const findRecord = async (p: Page) => {
    const record = p.getByRole("article").filter({ hasText: `Группа ${suffix}` });
    const pagination = p.getByRole("navigation", { name: "Страницы учебных назначений" });
    await expect(pagination).toBeVisible();
    while (!(await record.isVisible())) {
      const next = pagination.getByRole("link", { name: "Следующая страница" });
      const href = await next.getAttribute("href");
      const target = new URL(href!, p.url());
      await next.click();
      await p.waitForURL(url => url.searchParams.get("page") === target.searchParams.get("page"));
      await expect(pagination.getByText(`Страница ${target.searchParams.get("page")}`)).toBeVisible();
    }
    return record;
  };
  const directoryEntry = async (p: Page) => {
    for (let number = 1; ; number++) {
      const response = await p.request.get(`https://localhost:3000/api/education?page=${number}`);
      expect(response.ok(), `Education API returned ${response.status()}`).toBe(true);
      const result = await response.json() as {
        enrollments: { id: string; version: number }[];
        hasNext: boolean;
      };
      const entry = result.enrollments.find(item => item.id === enrollment.id);
      if (entry || !result.hasNext) return entry;
    }
  };
  try{
    const teacherContext=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:390,height:844}});contexts.push(teacherContext);const teacherPage=await teacherContext.newPage();await login(teacherPage,"teacher");
    const groups = teacherPage.getByRole("list", { name: "Мои группы" });
    for (const member of [group, economics, systems]) await expect(groups.locator(`a[href="/?groupId=${member.id}"]`)).toBeVisible();
    await groups.getByRole("link", { name: new RegExp(`Системный анализ ${suffix}`) }).click();
    await expect(teacherPage.getByRole("heading", { name: "В группе пока нет студентов" })).toBeVisible();
    await teacherPage.getByRole("link", { name: "Все группы" }).click();
    await groups.getByRole("link", { name: new RegExp(`Группа ${suffix}`) }).click();
    await teacherPage.locator(`a[href="/?enrollmentId=${enrollment.id}"]`).click();
    await expect(teacherPage.getByRole("progressbar")).toHaveCount(2);
    await teacherPage.getByRole("navigation").getByRole("link", { name: "Источники" }).click();
    await expect(teacherPage.getByRole("navigation").getByRole("link", { name: "Главная" })).toHaveAttribute("href", `/?enrollmentId=${enrollment.id}`);
    await teacherPage.getByRole("link",{name:"Мои студенты",exact:true}).click();await expect(teacherPage.getByRole("heading",{name:"Мои студенты"})).toBeVisible();
    const teacherRecord = await findRecord(teacherPage);
    await expect(teacherRecord.getByRole("link", { name: "Источники" })).toHaveAttribute("href", `/library?enrollmentId=${enrollment.id}`);
    await expect(teacherRecord.getByLabel("Тема диссертации")).toHaveCount(0);
    await studentPage.goto("https://localhost:3000/");await expect(studentPage.getByRole("progressbar")).toHaveCount(2);await studentPage.getByRole("link",{name:"Профиль",exact:true}).click();
    await expect(studentPage.getByRole("link", { name: "Профиль", exact: true })).toHaveAttribute("aria-current", "page");
    await expect(studentPage.getByRole("navigation", { name: "Разделы кабинета" }).getByRole("link", { name: "Источники" })).toHaveAttribute("href", `/library?enrollmentId=${enrollment.id}`);
    const article=await findRecord(studentPage);await article.getByLabel("Тема диссертации").fill(`Тема ${suffix}`);await article.getByLabel("Научный руководитель").fill("Научный руководитель");await article.getByRole("button",{name:"Сохранить",exact:true}).click();await expect(article.getByRole("status")).toHaveText("Сохранено");
    const forged=await studentPage.request.post("https://localhost:3000/api/education",{headers:{Origin:"https://localhost:3000"},data:{key:randomUUID(),command:{operation:"createGroup",periodId:period.id,name:"Forbidden"}}});expect(forged.status()).toBe(403);
    const current=await directoryEntry(page);
    expect(current).toBeDefined();
    await command({operation:"setGroupTeacher",id:economics.id,version:1,teacherId:teacher2.id});
    expect(await command({operation:"assign",id:enrollment.id,version:current!.version,groupId:economics.id})).toEqual(enrollment);
    await studentPage.goto("https://localhost:3000/");
    await expect(studentPage.getByLabel("Учебное назначение")).toContainText(`Экономика ${suffix}`);
    await expect(studentPage.getByRole("progressbar")).toHaveCount(2);
    await teacherPage.goto(`https://localhost:3000/library?enrollmentId=${enrollment.id}`);await expect(teacherPage.getByRole("heading",{name:"Учебное назначение недоступно"})).toBeVisible();await expect(teacherPage.getByRole("progressbar")).toHaveCount(0);
    const directoryRow = page.locator("[data-slot=collapsible]").filter({
      has: page.getByRole("button").filter({ hasText: person("student").email }),
    });
    await directoryRow.getByRole("button").filter({ hasText: person("student").email }).click();
    const active = directoryRow.getByRole("checkbox", { name: "Доступ активен" });
    await expect(active).toBeChecked();
    expect(await active.evaluate(element => new FormData(element.closest("form")!).get("active"))).toBe("on");
    await active.press("Space");
    await expect(active).not.toBeChecked();
    expect(await active.evaluate(element => new FormData(element.closest("form")!).get("active"))).toBeNull();
    await directoryRow.getByRole("button", { name: "Сохранить", exact: true }).click();
    await expect(directoryRow.getByRole("status")).toHaveText("Сохранено");
    expect((await studentPage.request.get("https://localhost:3000/api/session")).status()).toBe(401);
    await studentPage.goto("https://localhost:3000/");await expect(studentPage.getByRole("heading",{level:1})).toHaveText(/^(Доступ не назначен|Вход в кабинет)$/);
    await page.goto("/account",{waitUntil:"domcontentloaded"});await expect(page.getByRole("heading",{name:"Управление обучением"})).toBeVisible();await page.screenshot({path:testInfo.outputPath("admin.png")});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }finally{
    for(const context of contexts)await context.close();
    const state=await(await page.request.get("/api/education")).json();const user=state.users?.find((u:{id:string})=>u.id===studentId);
    if(user&&!user.active)await command({operation:"updateUser",id:studentId,version:user.version,fullName:user.fullName,role:"student",active:true});
  }
});
