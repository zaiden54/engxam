import "server-only";
import { createNeonAuth } from "@neon/auth/next/server";
import { createAuthServer, extractNeonAuthCookies } from "@neon/auth/server";
import { headers } from "next/headers";

function authConfig() {
  const baseUrl = process.env.NEON_AUTH_BASE_URL;
  const secret = process.env.NEON_AUTH_COOKIE_SECRET;
  if (!baseUrl || !secret || secret.length < 32) throw new Error("Neon Auth environment is missing or invalid");
  return { baseUrl, cookies: { secret, sessionDataTtl: 1 } };
}

export function getAuth() {
  return createNeonAuth(authConfig());
}

export function getPageSession() {
  const { baseUrl, cookies: { secret, sessionDataTtl } } = authConfig();
  return createAuthServer({
    baseUrl,
    cookieSecret: secret,
    sessionDataTtl,
    async context() {
      const requestHeaders = await headers();
      return {
        getCookies: () => extractNeonAuthCookies(requestHeaders),
        // Server Components cannot forward upstream Set-Cookie headers.
        setCookie: () => {},
        getHeader: name => requestHeaders.get(name),
        getOrigin: () => requestHeaders.get("origin") || requestHeaders.get("referer")?.split("/").slice(0, 3).join("/") || "",
        getFramework: () => "nextjs",
      };
    },
  }).getSession();
}
