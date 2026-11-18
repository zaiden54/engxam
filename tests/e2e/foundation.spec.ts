import { test, expect } from "@playwright/test";
import { blockExternalFontRequests } from "./test-fonts";

test.beforeEach(async ({ page }) => {
  // Functional checks use the supported font fallback when the CDN is unavailable.
  await blockExternalFontRequests(page);
});
for (const width of [360, 390, 768, 1280, 1440]) {
  test(`layout and navigation at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Вход в кабинет");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.getByRole("link", { name: /Установить или восстановить пароль/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Войти", exact: true })).toBeEnabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
test("keyboard skip link reaches main", async ({ page, isMobile }) => {
  test.skip(isMobile, "Physical keyboard tab order is verified on desktop; mobile uses touch navigation");
  await page.goto("/"); await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Перейти к содержимому" })).toBeFocused();
  await page.keyboard.press("Enter"); await expect(page.locator("main")).toBeFocused();
});

test("missing page provides a keyboard-accessible recovery action", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/missing-page-example");
  await expect(page.getByRole("heading", { name: "Страница не найдена" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const recovery = page.getByRole("link", { name: "На главную" });
  await recovery.focus();
  await expect(recovery).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/login$/);
});
test("200% text preserves navigation and layout", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Войти", exact: true })).toBeEnabled();
  await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByRole("link", { name: /Установить или восстановить пароль/ })).toBeVisible();
  await expect(page.getByLabel("Электронная почта")).toBeVisible();
});

test("coarse pointers have 44px targets on the login screen", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Checks the coarse-pointer styles on a touch device");
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  const submit = page.getByRole("button", { name: "Войти", exact: true });
  await expect(submit).toBeEnabled();
  for (const control of [submit, page.getByRole("button", { name: "Тёмная тема" }), page.getByLabel("Электронная почта")]) {
    const box = await control.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
    expect(box?.width).toBeGreaterThanOrEqual(44);
  }
});
test("dialog closes with Escape and restores focus", async ({ page }, testInfo) => {
  await page.goto("/ui-preview");
  const trigger = page.getByRole("button", { name: "Открыть диалог" });
  await trigger.click(); await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape"); await expect(page.getByRole("dialog")).not.toBeVisible(); await expect(trigger).toBeFocused();
  await page.goto("/"); await page.screenshot({ path: testInfo.outputPath("overview.png"), fullPage: true });
});

test("dialog prevents dismissal during an operation", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 844 });
  await page.goto("/ui-preview");
  const trigger = page.getByRole("button", { name: "Открыть диалог" });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Проверка диалога" });
  const close = dialog.getByRole("button", { name: "Закрыть", exact: true });
  await expect(close).toBeEnabled();
  await dialog.getByRole("button", { name: "Начать операцию" }).click();
  await expect(close).toBeDisabled();
  await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
  expect(await dialog.evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  await page.mouse.click(2, 2);
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Завершить операцию" }).click();
  await close.click();
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test("system theme and explicit selection persist across refresh and password navigation", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Тёмная тема" });
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("html")).toHaveCSS("color-scheme", "light dark");
  await toggle.click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("link", { name: /Установить или восстановить пароль/ }).click();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await toggle.click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("page and dialog follow system and explicit themes", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/ui-preview");
  const trigger = page.getByRole("button", { name: "Открыть диалог" });
  const toggle = page.getByRole("button", { name: "Тёмная тема" });
  const dialog = page.getByRole("dialog", { name: "Проверка диалога" });
  const body = page.locator("body");
  const expectTheme = async (theme: "light" | "dark") => {
    await expect(body).toHaveCSS("background-color", theme === "light" ? "rgb(246, 244, 243)" : "rgb(25, 23, 25)");
    await expect(dialog).toHaveCSS("background-color", theme === "light" ? "rgb(255, 255, 255)" : "rgb(35, 31, 34)");
  };

  await trigger.click();
  await expectTheme("light");
  await page.emulateMedia({ colorScheme: "dark" });
  await expectTheme("dark");

  await page.keyboard.press("Escape");
  await toggle.click();
  await page.reload();
  await trigger.click();
  await expectTheme("light");

  await page.keyboard.press("Escape");
  await toggle.click();
  await page.emulateMedia({ colorScheme: "light" });
  await page.reload();
  await trigger.click();
  await expectTheme("dark");
});
