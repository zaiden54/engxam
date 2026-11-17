import { test, expect } from "@playwright/test";
for (const width of [360, 390, 768, 1280, 1440]) {
  test(`layout and navigation at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Большая цель");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole("link", { name: /Перейти к входу/ }).click();
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
test("200% text preserves navigation and layout", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("link", { name: /Перейти к входу/ }).click();
  await expect(page.getByLabel("Электронная почта")).toBeVisible();
});
test("dialog closes with Escape and restores focus", async ({ page }, testInfo) => {
  await page.goto("/ui-preview");
  const trigger = page.getByRole("button", { name: "Открыть диалог" });
  await trigger.click(); await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape"); await expect(page.getByRole("dialog")).not.toBeVisible(); await expect(trigger).toBeFocused();
  await page.goto("/"); await page.screenshot({ path: testInfo.outputPath("overview.png"), fullPage: true });
});
