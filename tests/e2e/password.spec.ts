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
