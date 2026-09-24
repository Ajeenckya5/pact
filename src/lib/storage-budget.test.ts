import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  SHELL_BUDGET_BYTES,
  SHELL_CACHE,
  STORAGE_BUDGET_BYTES,
  evictionOrder,
  formatStorageMb,
  overStoragePressure,
} from "./storage-budget";

describe("storage budget", () => {
  it("treats 80% of 5 MB as pressure and evicts older caches first", () => {
    assert.equal(STORAGE_BUDGET_BYTES, 5 * 1024 * 1024);
    assert.equal(overStoragePressure(4 * 1024 * 1024), false);
    assert.equal(overStoragePressure(4 * 1024 * 1024 + 1), true);
    assert.deepEqual(evictionOrder(["pact-shell-v3", "pact-shell-v1", "other"]), ["other", "pact-shell-v1", "pact-shell-v3"]);
    assert.equal(formatStorageMb(1.5 * 1024 * 1024), "1.5 MB");
  });

  it("keeps the service worker on the app shell and under 2 MB", () => {
    const source = readFileSync(new URL("../../public/sw.js", import.meta.url), "utf8");
    assert.equal(SHELL_BUDGET_BYTES, 2 * 1024 * 1024);
    assert.match(source, new RegExp(SHELL_CACHE));
    assert.match(source, /SHELL_LIMIT = 2 \* 1024 \* 1024/);
    assert.equal(source.includes("cache.put(event.request"), false);
  });
});
