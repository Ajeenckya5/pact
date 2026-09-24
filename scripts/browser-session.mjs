import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";

const result = spawnSync("playwright", ["test"], { stdio: "inherit", env: process.env });
rmSync("test-results", { recursive: true, force: true });
rmSync("playwright-report", { recursive: true, force: true });
process.exit(result.status ?? 1);
