import { test,expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
test("password setup is public; reset endpoints do not register accounts",async({page,request})=>{
  await page.goto("/password");await expect(page.getByRole("heading",{name:"Установить пароль"})).toBeVisible();
  const email=`missing-${randomUUID()}@example.invalid`;
  const response=await request.post("/api/auth/email-otp/request-password-reset",{headers:{Origin:"https://localhost:3000"},data:{email}});
  expect(response.ok(),`OTP request status ${response.status()}`).toBeTruthy();
  const reset=await request.post("/api/auth/email-otp/reset-password",{headers:{Origin:"https://localhost:3000"},data:{email,otp:"000000",password:"Not-a-real-account-123"}});expect(reset.ok()).toBe(false);
  expect((await request.post("/api/auth/sign-up/email",{data:{email,password:"No-signup-123",name:"No"}})).status()).toBe(404);
});

test("password form preserves email for a repeat request", async ({ page }) => {
  const email = "repeat@example.invalid";
  const requested: string[] = [];
  await page.route("**/api/auth/email-otp/request-password-reset", async route => {
    requested.push(route.request().postDataJSON().email);
    await route.fulfill({ json: { success: true } });
  });
  await page.goto("/password");
  await page.getByLabel("Электронная почта").fill(email);
  await page.getByRole("button", { name: "Получить код" }).click();
  await expect(page.getByLabel("Код из письма")).toHaveAttribute("autocomplete", "one-time-code");
  await page.getByRole("button", { name: "Запросить новый код" }).click();
  await expect(page.getByLabel("Электронная почта")).toHaveValue(email);
  await page.getByRole("button", { name: "Получить код" }).click();
  await expect(page.getByLabel("Код из письма")).toBeVisible();
  expect(requested).toEqual([email, email]);
});
