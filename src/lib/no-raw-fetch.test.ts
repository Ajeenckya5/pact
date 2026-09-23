import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const root = join(import.meta.dirname, "../..");
const needle = new RegExp("\\bfetch\\s*\\(");

function filesIn(dir: string, out: string[] = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next") continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) filesIn(path, out);
    else if (/\.(ts|tsx|js|mjs)$/.test(name)) out.push(path);
  }
  return out;
}

describe("network boundary", () => {
  it("keeps raw fetch inside the net helper", () => {
    const hits = filesIn(join(root, "src"))
      .filter((path) => !path.endsWith(`${join("packages", "core", "src", "net.ts")}`))
      .filter((path) => needle.test(readFileSync(path, "utf8")));
    assert.deepEqual(hits, []);
  });
});
