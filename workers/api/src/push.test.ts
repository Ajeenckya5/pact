import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NUDGE_PUSH } from "./push";

describe("partner nudge push", () => {
  it("stays an opaque title and does not carry health fields", () => {
    const raw = JSON.stringify(NUDGE_PUSH);
    assert.equal(raw.includes("sleep"), false);
    assert.equal(raw.includes("water"), false);
    assert.equal(raw.includes("heart"), false);
    assert.equal(NUDGE_PUSH.title, "Pact");
    assert.match(NUDGE_PUSH.body, /nudged you/);
  });
});