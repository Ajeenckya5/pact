import { existsSync, mkdirSync, renameSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const api = path.join(root, "src/app/api");
const parkedDir = path.join(root, ".static-park");
const parked = path.join(parkedDir, "api");

mkdirSync(parkedDir, { recursive: true });

let moved = false;
if (existsSync(api)) {
  renameSync(api, parked);
  moved = true;
}

const env = { ...process.env, PACT_STATIC: "1" };
let status = 1;
try {
  const result = spawnSync("npx", ["next", "build"], { stdio: "inherit", env, cwd: root, shell: process.platform === "win32" });
  status = result.status ?? 1;
  if (status === 0) {
    const out = path.join(root, "out");
    if (existsSync(out)) {
      writeFileSync(path.join(out, ".nojekyll"), "");
    }
  }
} finally {
  if (moved && existsSync(parked) && !existsSync(api)) {
    renameSync(parked, api);
  }
}

process.exit(status);
