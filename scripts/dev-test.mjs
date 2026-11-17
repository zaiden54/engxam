import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { spawn, spawnSync } from "node:child_process";

const testEnv = parseEnv(readFileSync(".env.stage02", "utf8"));
if (testEnv.NEON_BRANCH !== "engxam-stage02") {
  throw new Error("Expected the isolated engxam-stage02 branch in .env.stage02");
}
for (const key of ["DATABASE_URL", "NEON_AUTH_BASE_URL", "AWS_ENDPOINT_URL_S3"]) {
  if (!testEnv[key]) throw new Error(`Missing test configuration: ${key}`);
}
console.log("Development environment: engxam-stage02 (test data)");
if (!process.argv.includes("--check")) {
  const certificate = spawnSync(process.execPath, ["scripts/local-certificate.mjs"], { stdio: "inherit" });
  if (certificate.status !== 0) process.exit(certificate.status ?? 1);
  const child = spawn(process.execPath, [
    "node_modules/next/dist/bin/next", "dev", "--hostname", "localhost",
    "--experimental-https", "--experimental-https-key", "certificates/localhost-key.pem",
    "--experimental-https-cert", "certificates/localhost.pem",
  ], { stdio: "inherit", env: { ...process.env, ...testEnv } });
  child.on("error", () => { console.error("Unable to start Next.js"); process.exitCode = 1; });
  child.on("exit", code => { process.exitCode = code ?? 0; });
}
