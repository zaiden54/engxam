import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
test("Neon Auth: signup fixture, login, reload, session, logout, protection", async ({ page, request }) => {
  test.skip(process.env.RUN_NEON_E2E !== "1", "Explicit opt-in required for temporary remote user");
  test.setTimeout(90000);
  const email = `engxam-probe-${randomUUID()}@example.invalid`;
  const password = `${randomUUID()}Aa!`;
  const response = await request.post(`${process.env.NEON_AUTH_BASE_URL}/sign-up/email`, { headers: { Origin: "http://localhost:3000" }, data: { email, password, name: "Engxam temporary probe" } });
  if (!response.ok()) { const failure = await response.json(); throw Error(`temporary signup ${response.status()}: ${failure.code} ${failure.message}`); }
  const data = await response.json();
  const id = data.user.id as string;
  try {
    page.on("response", async response => {
      if (response.url().includes("/api/auth/sign-in/email")) {
        const body = await response.json().catch(() => ({}));
        console.log("Auth response", response.status(), body.code ?? "success");
      }
    });
    await page.goto("/account"); await expect(page).toHaveURL(/\/login$/);
    expect((await page.request.get("/api/session")).status()).toBe(401);
    await page.getByLabel("Электронная почта").fill(email); await page.getByLabel("Пароль", { exact: true }).fill("incorrect-password");
    await page.getByRole("button", { name: "Войти", exact: true }).click(); await expect(page.getByRole("alert")).toBeVisible();
    await page.getByLabel("Пароль", { exact: true }).fill(password); await page.getByRole("button", { name: "Войти", exact: true }).click();
    // An Auth identity alone has no application role. Stage02 provisioning is required.
    await expect(page.getByRole("heading", { name: "Доступ не назначен" })).toBeVisible();
    await page.reload(); await expect(page.getByRole("heading", { name: "Доступ не назначен" })).toBeVisible();
    expect((await page.request.get("/api/session")).status()).toBe(401);
    await page.getByRole("button", { name: "Выйти" }).click(); await expect(page).toHaveURL(/\/login$/);
    expect((await page.request.get("/api/session")).status()).toBe(401);
    await page.goto("/account"); await expect(page).toHaveURL(/\/login$/);
  } finally {
    if (!/^[a-zA-Z0-9-]+$/.test(id)) throw Error("Unexpected test user ID");
    execFileSync("cmd.exe", ["/d", "/s", "/c", `neon neon-auth user delete ${id}`], { stdio: "pipe" });
    console.log("Temporary auth user deleted");
  }
});
