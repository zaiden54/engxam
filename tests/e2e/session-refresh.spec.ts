import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";
import { NEON_AUTH_SESSION_COOKIE_NAME, NEON_AUTH_SESSION_DATA_COOKIE_NAME } from "@neon/auth/server";

test("protected pages handle missing cache and a revoked session cookie", async ({ page, context }) => {
  test.skip(process.env.E2E_STAGE02 !== "1", "Requires isolated Stage02 credentials");
  const fixtures = JSON.parse(readFileSync(".env.stage02-fixtures.json", "utf8")) as {
    role: string; email: string; password: string;
  }[];
  const admin = fixtures.find(person => person.role === "admin")!;
  await page.goto("/login");
  await page.getByLabel("Электронная почта").fill(admin.email);
  await page.getByLabel("Пароль", { exact: true }).fill(admin.password);
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Главная", exact: true })).toBeVisible();

  await context.clearCookies({ name: NEON_AUTH_SESSION_DATA_COOKIE_NAME });
  await page.reload();
  await expect(page.getByRole("heading", { name: "Главная", exact: true })).toBeVisible();
  await page.goto("/account");
  await expect(page.getByRole("heading", { name: "Управление обучением" })).toBeVisible();

  const sessionCookie = (await context.cookies()).find(cookie => cookie.name === NEON_AUTH_SESSION_COOKIE_NAME)!;
  await page.getByRole("button", { name: "Выйти", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);

  await context.addCookies([sessionCookie]);
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Вход в кабинет" })).toBeVisible();
  await page.goto("/account");
  await expect(page).toHaveURL(/\/login$/);
});
