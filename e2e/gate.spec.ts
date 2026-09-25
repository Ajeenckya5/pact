import path from "node:path";
import { expect, test, type Page } from "playwright/test";

/**
 * Design gate. Every route, light and dark, empty and with sample data:
 * no WCAG 2.2 AA violations, and no sideways scroll at 200% text on a 390 px phone.
 * Plus the keyboard path through first run and the two daily-box rules that broke before.
 */

const ROUTES = [
  "/",
  "/log/",
  "/calories/",
  "/water/",
  "/sleep/",
  "/workouts/",
  "/workouts/open/",
  "/workouts/prog-ppl3/",
  "/people/",
  "/chat/",
  "/join/",
  "/you/",
  "/coach/",
  "/fuel/",
  "/recipes/",
  "/wearables/",
  "/privacy/",
  "/faq/",
  "/delete/",
  "/friends/",
  "/community/",
  "/live/",
  "/map/",
  "/strava/",
];
const SAMPLE_ONLY = ["/chat/maya/", "/workouts/group/g-hills/"];
const AXE = path.join(process.cwd(), "node_modules/axe-core/axe.min.js");
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function firstRun(page: Page) {
  await page.goto("./");
  const later = page.getByRole("button", { name: "Later" });
  await later.click({ timeout: 10_000 }).catch(() => {});
}

async function setTheme(page: Page, theme: "light" | "dark") {
  await page.evaluate(
    (t) =>
      new Promise<void>((resolve) => {
        const open = indexedDB.open("pact", 2);
        open.onsuccess = () => {
          const tx = open.result.transaction("account", "readwrite");
          const store = tx.objectStore("account");
          const get = store.get("current");
          get.onsuccess = () => {
            if (get.result) store.put({ ...get.result, prefs: { ...get.result.prefs, theme: t } }, "current");
          };
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        };
        open.onerror = () => resolve();
      }),
    theme,
  );
}

async function visit(page: Page, route: string) {
  await page.goto(`.${route}`, { waitUntil: "load" });
  await page.getByRole("main").waitFor();
  await page.waitForTimeout(400);
}

async function axeViolations(page: Page) {
  await page.addScriptTag({ path: AXE });
  return page.evaluate(async (tags) => {
    const axe = (window as unknown as { axe: { run: (c: Document, o: object) => Promise<{ violations: Array<{ id: string; nodes: Array<{ target: string[] }> }> }> } }).axe;
    const result = await axe.run(document, { runOnly: tags });
    return result.violations.map((v) => `${v.id} ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(", ")}`);
  }, TAGS);
}

async function sidewaysAt200(page: Page) {
  return page.evaluate(async () => {
    document.documentElement.style.fontSize = "200%";
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const extra = document.documentElement.scrollWidth - document.documentElement.clientWidth;
    document.documentElement.style.fontSize = "";
    return extra;
  });
}

for (const data of ["empty", "sample"] as const) {
  for (const theme of ["light", "dark"] as const) {
    test(`${data} account, ${theme}: every route passes axe and reflows at 200% text`, async ({ page }) => {
      test.setTimeout(240_000);
      await firstRun(page);
      if (data === "sample") await page.getByRole("button", { name: "Explore with sample data" }).click();
      await setTheme(page, theme);
      const failures: string[] = [];
      for (const route of data === "sample" ? [...SAMPLE_ONLY, ...ROUTES] : ROUTES) {
        await visit(page, route);
        const isLight = await page.evaluate(() => document.documentElement.classList.contains("light"));
        expect(isLight, `${route} theme`).toBe(theme === "light");
        for (const v of await axeViolations(page)) failures.push(`${route} axe: ${v}`);
        if (theme === "light") {
          const extra = await sidewaysAt200(page);
          if (extra > 1) failures.push(`${route} scrolls ${extra}px sideways at 200% text`);
        }
      }
      expect(failures).toEqual([]);
    });
  }
}

test("first run is a keyboard modal: focus inside, Escape means Later, skip link first", async ({ page }) => {
  await page.goto("./");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Tab");
  expect(await page.evaluate(() => !!document.activeElement?.closest("[role=dialog]"))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toHaveText(/skip to content/i);
});

test("a new pact day opens the boxes and keeps yesterday out of today", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-09-22T14:00:00.000Z") });
  await firstRun(page);
  await visit(page, "/");
  const add = page.getByRole("button", { name: "Add 250 ml of water" });
  for (let i = 0; i < 12 && (await add.count()); i += 1) await add.click();
  await page.getByRole("button", { name: "Log sleep" }).click();
  await page.locator("#sleep-hours").fill("8");
  await page.getByRole("button", { name: "Save sleep" }).click();
  await expect(page.locator("[data-sleep-source]")).toHaveText("8 h · Logged by you");

  await page.clock.setSystemTime(new Date("2026-09-23T14:00:00.000Z"));
  await visit(page, "/log/");
  await expect(page.getByText("Water today: 0 ml")).toBeVisible();
  await visit(page, "/");
  await expect(page.getByRole("button", { name: "Log sleep" })).toBeVisible();
  await expect(page.locator("[data-sleep-source]")).toHaveCount(0);
});

test("device sleep shows its source and a correction is saved as the user's", async ({ page }) => {
  await firstRun(page);
  await page.getByRole("button", { name: "Explore with sample data" }).click();
  await expect(page.locator("[data-sleep-source]")).toHaveText("7.4 h · Sample data");
  await page.getByRole("button", { name: "Edit sleep" }).click();
  await expect(page.locator("#sleep-hours")).toBeFocused();
  await page.locator("#sleep-hours").fill("6.5");
  await page.getByRole("button", { name: "Save sleep" }).click();
  await expect(page.locator("[data-sleep-source]")).toHaveText("6.5 h · Logged by you");
  await expect(page.getByRole("button", { name: "Log sleep" })).toBeVisible();
});
