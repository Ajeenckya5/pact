import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assertReport } from "./guard";

describe("report", () => {
  it("keeps one shared message and rejects health fields", () => {
    const report = assertReport({
      v: 1,
      pactId: "p1",
      reporter: "alice",
      messageId: "m1",
      reason: "harassment",
      text: "the one message",
    });
    assert.equal(report.text, "the one message");
    assert.throws(() => assertReport({ v: 1, pactId: "p1", reporter: "alice", messageId: "m1", reason: "x", text: "y", recovery: 1 }));
  });
});
