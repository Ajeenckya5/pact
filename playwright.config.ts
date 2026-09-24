import { defineConfig } from "playwright/test";

const origin = process.env.PACT_WEB_ORIGIN ?? "http://localhost:3099";

export default defineConfig({
  testDir: "e2e",
  outputDir: "test-results",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: "line",
  use: {
    channel: "chrome",
    baseURL: origin,
    video: "off",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "pnpm exec next dev -p 3099 -H localhost",
    url: origin,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
