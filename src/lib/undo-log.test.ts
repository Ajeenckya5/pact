import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { entriesToday, latestUndo, undoLabel, withoutEntry } from "./undo-log";

describe("mixed undo", () => {
  it("removes the newer food entry after a water pour", () => {
    const entries = [
      { kind: "water" as const, id: "w", ml: 200, createdAt: "2026-09-23T12:00:00.000Z" },
      { kind: "food" as const, id: "f", name: "Idli", createdAt: "2026-09-23T12:05:00.000Z" },
    ];
    const last = latestUndo(entries);
    assert.equal(last?.kind, "food");
    assert.equal(undoLabel(last), "Undo Idli");
    assert.deepEqual(withoutEntry(entries, last!.id).map((entry) => entry.id), ["w"]);
  });

  it("names a 750 ml pour when that pour is newest", () => {
    const entries = [
      { kind: "water" as const, id: "a", ml: 200, createdAt: "2026-09-23T12:00:00.000Z" },
      { kind: "water" as const, id: "b", ml: 750, createdAt: "2026-09-23T12:05:00.000Z" },
    ];
    const last = latestUndo(entries);
    assert.equal(undoLabel(last), "Undo +750 ml");
    assert.equal(withoutEntry(entries, "b")[0].id, "a");
  });

  it("keeps today's newest entry after the log is rebuilt", () => {
    const saved = {
      waterLog: [
        { id: "old", ml: 1000, at: "2026-09-22T18:00:00.000Z" },
        { id: "w", ml: 750, at: "2026-09-23T12:00:00.000Z" },
      ],
      meals: [{ id: "f", name: "Idli", at: "2026-09-23T15:00:00.000Z" }],
    };
    const now = new Date("2026-09-23T18:00:00.000Z");
    const first = latestUndo(entriesToday(saved, now, "UTC"));
    const again = latestUndo(entriesToday(saved, now, "UTC"));
    assert.equal(first?.id, "f");
    assert.equal(again?.id, "f");
    assert.equal(undoLabel(again), "Undo Idli");
  });
});
