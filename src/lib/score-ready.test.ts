import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hasPactData } from "./score-ready";

const empty = {
  meals: [],
  waterMl: 0,
  workoutLogs: [],
  checkins: { sleep: false, fuel: false, water: false, move: false },
  history: [],
};

describe("score gate", () => {
  it("hides a score when nothing is logged", () => {
    assert.equal(hasPactData(empty), false);
  });

  it("shows a score after a sip, a meal, or sample data", () => {
    assert.equal(hasPactData({ ...empty, waterMl: 200 }), true);
    assert.equal(hasPactData({ ...empty, meals: [{}] }), true);
    assert.equal(hasPactData({ ...empty, demo: true }), true);
  });
});
