import type { Page } from "@playwright/test";

export async function blockExternalFontRequests(page: Page) {
  await page.route(/^https:\/\/fonts\.(?:googleapis|gstatic)\.com\//, route => route.abort());
}
