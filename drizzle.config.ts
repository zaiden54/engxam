import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { defineConfig } from "drizzle-kit";
const { loadEnvConfig } = createRequire(import.meta.url)("@next/env");
loadEnvConfig(process.cwd());
if (process.env.ENGXAM_ENV_FILE) Object.assign(process.env,parseEnv(readFileSync(process.env.ENGXAM_ENV_FILE,"utf8")));
if (!process.env.DATABASE_URL_UNPOOLED) throw new Error("Set DATABASE_URL_UNPOOLED before running migrations");
export default defineConfig({ schema: "./src/db/schema/*.ts", out: "./migrations", dialect: "postgresql", dbCredentials: { url: process.env.DATABASE_URL_UNPOOLED }, strict: true });
