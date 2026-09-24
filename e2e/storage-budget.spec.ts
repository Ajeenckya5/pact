import { expect, test } from "playwright/test";

const BUDGET = 5 * 1024 * 1024;
const SHELL = 2 * 1024 * 1024;

async function dismissLater(page: import("playwright/test").Page) {
  const later = page.getByRole("button", { name: "Later" });
  try {
    await later.click({ timeout: 8000 });
  } catch {
    /* onboarding is already done */
  }
}

test("a full session stays inside the storage budget", async ({ page }) => {
  await page.goto("/");
  await dismissLater(page);
  await page.goto("/water");
  await dismissLater(page);
  await page.getByRole("button", { name: "+200 ml" }).click();
  await page.goto("/you");
  await dismissLater(page);
  await expect(page.getByText(/Storage used: \d+\.\d MB/)).toBeVisible();
  const usage = await page.evaluate(async () => {
    const estimate = await navigator.storage.estimate();
    let shell = 0;
    const names = await caches.keys();
    for (const name of names) {
      const cache = await caches.open(name);
      for (const request of await cache.keys()) {
        const hit = await cache.match(request);
        if (hit) shell += (await hit.blob()).size;
      }
    }
    return { usage: estimate.usage ?? 0, shell };
  });
  expect(usage.usage).toBeLessThanOrEqual(BUDGET);
  expect(usage.shell).toBeLessThanOrEqual(SHELL);
});
