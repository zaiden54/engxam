import {expect,type Page} from "@playwright/test";
import { test } from "./study-fixtures";
import {readFileSync} from "node:fs";
import {randomUUID} from "node:crypto";
import {PDFDocument} from "pdf-lib";
import {blockExternalFontRequests} from "./test-fonts";
test("glossary preview, editing, archive, 500-row batch and teacher read-only access", { tag: "@stage02" },async({page,browser,cleanStudentMembership},testInfo)=>{
  test.setTimeout(120000);page.setDefaultTimeout(15000);
  const people=JSON.parse(readFileSync(".env.stage02-fixtures.json","utf8")) as {role:string;email:string;password:string;id:string}[];const person=(role:string)=>people.find(p=>p.role===role)!;
  const login=async(p:Page,role:string)=>{await p.goto("https://localhost:3000/login",{waitUntil:"domcontentloaded"});await p.getByLabel("Электронная почта").fill(person(role).email);await p.getByLabel("Пароль",{exact:true}).fill(person(role).password);await p.getByRole("button",{name:"Войти",exact:true}).click();await expect(p).toHaveURL(/\/$/);};
  await blockExternalFontRequests(page);
  await login(page,"admin");const command=async(command:unknown)=>{const response=await page.request.post("/api/education",{timeout:15000,headers:{Origin:"https://localhost:3000"},data:{key:randomUUID(),command}});const result=await response.json();expect(response.ok(),JSON.stringify(result)).toBe(true);return result as {id:string};};
  const suffix=randomUUID().slice(0,8);const period=await command({operation:"createPeriod",name:`Glossary ${suffix}`,startsOn:"2026-09-02",endsOn:"2027-08-31",preparationDeadline:"2027-04-01"});const group=await command({operation:"createGroup",periodId:period.id,name:`Glossary ${suffix}`,teacherId:person("teacher").id});const enrollment=await command({operation:"enroll",studentId:cleanStudentMembership,groupId:group.id,specialty:"Economics",language:"en"});
  const before=await page.request.get(`/api/glossary?enrollmentId=${enrollment.id}`);expect(before.status()).toBe(404);
  await page.getByRole("button",{name:"Выйти",exact:true}).click();await expect(page).toHaveURL(/\/login$/);await login(page,"student");await page.goto(`/glossary?enrollmentId=${enrollment.id}`);await expect(page.getByRole("heading",{name:"Словарь терминов"})).toBeVisible();
  const sourceTitle = `Source ${suffix}`;
  const pdf = await PDFDocument.create();
  pdf.addPage();
  pdf.setTitle(suffix);
  const bytes = Buffer.from(await pdf.save());
  const origin = { Origin: new URL(page.url()).origin };
  const upload = await page.request.post("/api/files/uploads", {
    headers: origin,
    data: { key: randomUUID(), enrollmentId: enrollment.id, name: "source.pdf", size: bytes.length },
  });
  expect(upload.ok()).toBe(true);
  const signed: { id: string; url: string; headers: Record<string, string> } = await upload.json();
  const stored = await page.request.put(signed.url, { data: bytes, headers: signed.headers, timeout: 20000, maxRetries: 1 });
  expect(stored.ok()).toBe(true);
  const complete = await page.request.post(`/api/files/${signed.id}/complete`, { headers: origin });
  expect(complete.ok()).toBe(true);
  const material = await page.request.post("/api/literature", {
    headers: origin,
    data: {
      key: randomUUID(),
      enrollmentId: enrollment.id,
      metadata: {
        title: sourceTitle, authors: "Test Author", materialType: "article", publicationYear: 2026,
        publicationSource: "Test Journal", publicationPages: "1", doi: "", url: "",
        declaredCharacters: 100, declaredWords: null, fileId: signed.id,
      },
    },
  });
  expect(material.ok()).toBe(true);
  await page.reload({ waitUntil: "domcontentloaded" });

  const composer = page.locator(".composer").filter({ has: page.getByRole("button", { name: "Добавить термин", exact: true }) });
  await composer.getByRole("button", { name: "Добавить термин", exact: true }).click();
  const single = composer.locator("form");
  const singleTerm = `Linked draft ${suffix}`;
  await single.getByLabel("Термин на английском").fill(singleTerm);
  const sources = single.getByRole("listbox");
  await sources.selectOption({ label: sourceTitle });
  const sourceId = await sources.inputValue();
  await page.route("**/api/glossary", route => route.fulfill({ status: 503, json: { message: "Повторите сохранение" } }), { times: 1 });
  await single.getByRole("button", { name: "Добавить термин", exact: true }).click();
  await expect(single.getByRole("status")).toHaveText("Повторите сохранение");
  await expect(single.getByLabel("Термин на английском")).toHaveValue(singleTerm);
  await expect(sources).toHaveValues([sourceId]);
  const saveDraft = page.waitForRequest(request => new URL(request.url()).pathname === "/api/glossary" && request.method() === "POST");
  await single.getByRole("button", { name: "Добавить термин", exact: true }).click();
  expect((await saveDraft).postDataJSON().sourceIds).toEqual([sourceId]);
  const draftCard = page.getByRole("article").filter({ has: page.getByRole("heading", { name: singleTerm, exact: true }) });
  await expect(draftCard.getByText("Черновик без перевода", { exact: false })).toBeVisible();
  await draftCard.getByRole("button", { name: "Определение, контекст и источники" }).click();
  await expect(draftCard.getByRole("link", { name: sourceTitle })).toBeVisible();
  await draftCard.getByRole("button", { name: "В архив", exact: true }).click();
  await expect(draftCard).toHaveCount(0);
  await page.getByText("Добавить списком",{exact:true}).click();const batch=page.locator(".batch-editor");
  const term=`Public policy ${suffix}`;const draft=`Economic growth ${suffix}`;
  await batch.getByLabel("Термины списком",{exact:true}).fill(`${term}\tполитика\n${term.toUpperCase()}\tдубль\n${draft}\n\tбез термина`);await batch.getByRole("button",{name:"Предпросмотр пакета",exact:true}).click();await expect(batch.getByRole("heading",{name:"Предпросмотр: 4 строк"})).toBeVisible();await expect(batch.getByRole("checkbox",{name:"Выбрать строку 2",exact:true})).toBeDisabled();
  await batch.getByLabel("Перевод, строка 3",{exact:true}).fill("экономический рост");await expect(batch.getByRole("button",{name:"Сохранить выбранные (2)",exact:true})).toBeDisabled();await batch.getByRole("button",{name:"Проверить изменения",exact:true}).click();await batch.getByRole("button",{name:"Сохранить выбранные (2)",exact:true}).click();await expect(batch.getByRole("status")).toContainText("Сохранено 2 терминов",{timeout:20000});
  const card=page.locator(".term-card").filter({has:page.getByRole("heading",{name:term,exact:true})});await expect(card).toBeVisible();await card.getByText("Редактировать термин",{exact:true}).click();await card.getByLabel("Перевод на русский",{exact:true}).fill("государственная политика");await card.getByRole("button",{name:"Сохранить термин",exact:true}).click();await expect(page.locator(".term-card").filter({has:page.getByRole("heading",{name:term,exact:true})}).locator(".eyebrow")).toContainText("Ревизия 2");
  const revised=page.locator(".term-card").filter({has:page.getByRole("heading",{name:term,exact:true})});await revised.getByRole("button",{name:"В архив",exact:true}).click();await expect(page.getByRole("heading",{name:term,exact:true})).toHaveCount(0);
  await page.getByLabel("Состояние",{exact:true}).selectOption("archived");await page.getByRole("button",{name:"Найти",exact:true}).click();await page.waitForURL(url=>url.searchParams.get("status")==="archived");
  const restore=page.waitForResponse(response=>response.url().endsWith("/api/glossary")&&response.request().method()==="POST");
  await revised.getByRole("button",{name:"Восстановить термин",exact:true}).click();expect((await restore).ok()).toBe(true);await expect(revised).toHaveCount(0,{timeout:15000});await page.getByLabel("Состояние",{exact:true}).selectOption("active");await page.getByRole("button",{name:"Найти",exact:true}).click();
  await page.waitForURL(url=>url.searchParams.get("status")==="active");
  if (!(await batch.isVisible())) await page.getByText("Добавить списком",{exact:true}).click();
  await batch.getByLabel("Термины списком",{exact:true}).fill(Array.from({length:500},(_,i)=>`batch term ${suffix} ${i}\tперевод ${i}`).join("\n"));await batch.getByRole("button",{name:"Предпросмотр пакета",exact:true}).click();await expect(batch.getByRole("heading",{name:"Предпросмотр: 500 строк"})).toBeVisible();await expect(batch.locator(".batch-row")).toHaveCount(25);await batch.getByRole("button",{name:"Следующие строки",exact:true}).click();await expect(batch.getByRole("checkbox",{name:"Выбрать строку 26",exact:true})).toBeChecked();await batch.getByRole("button",{name:"Сохранить выбранные (500)",exact:true}).click();await expect(batch.getByRole("status")).toContainText("Сохранено 500 терминов",{timeout:20000});await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow","500");await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuetext","502 из 500 терминов");
  const nextPage = page.getByRole("navigation", { name: "Страницы словаря" }).getByRole("link", { name: "Следующая страница" });
  await nextPage.click();
  await page.waitForURL(url => url.searchParams.get("page") === "2" && url.searchParams.get("enrollmentId") === enrollment.id);
  await expect(page.getByText("Страница 2", { exact: true })).toBeVisible();
  await page.getByLabel("Поиск по термину и переводу",{exact:true}).fill(term);await page.getByRole("button",{name:"Найти",exact:true}).click();await expect(page.getByRole("heading",{name:term,exact:true})).toBeVisible();await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuetext","502 из 500 терминов");await page.getByRole("link",{name:"Главная",exact:true}).click();await expect(page.getByRole("progressbar",{name:"Термины с переводом"})).toHaveAttribute("aria-valuetext","502 из 500 терминов");await page.getByRole("link",{name:"Словарь",exact:true}).click();await expect(page.getByRole("heading",{name:"Словарь терминов"})).toBeVisible();await page.screenshot({path:testInfo.outputPath("glossary.png"),fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const teacherContext=await browser.newContext({ignoreHTTPSErrors:true});try{const teacher=await teacherContext.newPage();teacher.setDefaultTimeout(15000);await blockExternalFontRequests(teacher);await login(teacher,"teacher");await teacher.goto(`https://localhost:3000/glossary?enrollmentId=${enrollment.id}&q=${encodeURIComponent(term)}`);await expect(teacher.getByRole("heading",{name:term,exact:true})).toBeVisible();await expect(teacher.getByText("Добавить списком",{exact:true})).toHaveCount(0);const denied=await teacher.request.post("https://localhost:3000/api/glossary/batch/preview",{headers:{Origin:"https://localhost:3000"},data:{enrollmentId:enrollment.id,text:"new term"}});expect(denied.status()).toBe(404);}finally{await teacherContext.close();}
});
