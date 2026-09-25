import { defineConfig } from "playwright/test";

// Runs the design gate against the static export (`pnpm run export`), the same files Pages serves.
const port = Number(process.env.PACT_GATE_PORT ?? 3199);

export default defineConfig({
  testDir: "e2e",
  testMatch: /gate\.spec\.ts/,
  outputDir: "test-results",
  fullyParallel: true,
  workers: process.env.CI ? 2 : 3,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: "line",
  use: {
    // CI and Macs use installed Chrome; PACT_CHROMIUM_PATH points at any other Chromium build.
    ...(process.env.PACT_CHROMIUM_PATH
      ? { launchOptions: { executablePath: process.env.PACT_CHROMIUM_PATH } }
      : { channel: "chrome" }),
    baseURL: `http://localhost:${port}/`,
    viewport: { width: 390, height: 844 },
    timezoneId: "America/Chicago",
    video: "off",
    trace: "retain-on-failure",
  },
  webServer: {
    command: `python3 -m http.server ${port} --directory out`,
    url: `http://localhost:${port}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    stdout: "ignore",
    stderr: "ignore",
  },
});
