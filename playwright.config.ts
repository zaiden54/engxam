import { defineConfig, devices } from "@playwright/test";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
const testEnv:Record<string,string>=process.env.E2E_STAGE02==="1"?Object.fromEntries(Object.entries(parseEnv(readFileSync(".env.stage02","utf8"))).filter((entry):entry is [string,string]=>entry[1]!==undefined)):{};
export default defineConfig({ testDir: "./tests/e2e", fullyParallel: true, workers: process.env.E2E_STAGE02 === "1" ? 1 : undefined, use: { baseURL: "https://localhost:3000", ignoreHTTPSErrors: true, trace: "off" }, projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }, { name: "mobile-webkit", use: { ...devices["iPhone 13"] } }], webServer: { env:testEnv, ignoreHTTPSErrors: true, command: "npm run dev:https", url: "https://localhost:3000", reuseExistingServer: !process.env.CI && process.env.E2E_STAGE02!=="1" } });
