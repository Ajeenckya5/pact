import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { dedupeLines, pushSip, totalWater, undoLatestSip, type WaterSip } from "./water-log";

describe("water undo", () => {
  test("undo removes the newest sip and names its amount", () => {
    let log: WaterSip[] = [];
    log = pushSip(log, { id: "a", ml: 200, at: "2026-09-22T12:00:00.000Z" });
    log = pushSip(log, { id: "b", ml: 750, at: "2026-09-22T12:05:00.000Z" });
    assert.equal(totalWater(log), 950);
    const undone = undoLatestSip(log);
    assert.equal(undone.removed?.ml, 750);
    assert.equal(undone.removed?.id, "b");
    assert.equal(totalWater(undone.log), 200);
  });

  test("an older sip is not removed when a newer one exists", () => {
    const log: WaterSip[] = [
      { id: "old", ml: 200, at: "2026-09-22T08:00:00.000Z" },
      { id: "new", ml: 750, at: "2026-09-22T18:00:00.000Z" },
    ];
    const undone = undoLatestSip(log);
    assert.equal(undone.removed?.id, "new");
    assert.deepEqual(undone.log.map((s) => s.id), ["old"]);
  });
});

describe("reason lines", () => {
  test("duplicate protein lines collapse", () => {
    const lines = dedupeLines([
      "Still 85g protein short of Cut — eat either side of the session.",
      "Still 85g protein short of Cut — eat either side of the session.",
    ]);
    assert.equal(lines.length, 1);
  });
});
