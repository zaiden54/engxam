import { expect, type Page } from "@playwright/test";

export async function expectResponsiveLayout(page: Page) {
  const viewport = page.viewportSize();
  try {
    for (const colorScheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme });
      await expect(page.locator("body")).toHaveCSS(
        "background-color", colorScheme === "light" ? "rgb(246, 245, 249)" : "rgb(37, 38, 47)",
      );
      for (const [width, height] of [[360, 844], [390, 844], [430, 844], [844, 430], [767, 844], [768, 844], [1023, 844], [1024, 844]]) {
        await page.setViewportSize({ width, height });
        await expect.poll(() => page.evaluate(async () => {
          window.scrollTo(0, document.documentElement.scrollHeight);
          await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
          const last = document.querySelector("main")?.lastElementChild;
          const bar = document.querySelector(".mobile-study-nav")?.getBoundingClientRect();
          return {
            fits: document.documentElement.scrollWidth <= innerWidth,
            endVisible: !last || last.getBoundingClientRect().bottom <= (bar?.height ? bar.top : innerHeight) + 1,
          };
        }), { message: `${colorScheme} at ${width}×${height} on ${new URL(page.url()).pathname}` })
          .toEqual({ fits: true, endVisible: true });
      }
    }
  } finally {
    if (viewport) await page.setViewportSize(viewport);
    await page.emulateMedia({ colorScheme: null });
    await page.evaluate(() => window.scrollTo(0, 0));
  }
}
