import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { onPactDay, pactToday, rollPactDay, type DaySlice } from "./pact-day";

const ZONE = "America/Chicago";
const GOALS = { waterMl: 3000, protein: 140 };
// 09:00 Chicago on Sep 22 and Sep 23.
const DAY1 = new Date("2026-09-22T14:00:00.000Z");
const DAY2 = new Date("2026-09-23T14:00:00.000Z");

function slice(over: Partial<DaySlice> = {}): DaySlice {
  return {
    day: "2026-09-22",
    meals: [{ at: DAY1.toISOString(), protein: 150 }],
    waterLog: [{ id: "a", ml: 3000, at: DAY1.toISOString() }],
    workoutLogs: [{ at: DAY1.toISOString(), minutes: 60 }],
    waterMl: 3000,
    strain: 21,
    readingMin: 20,
    sleepMin: 480,
    sleepSource: "user",
    checkins: { sleep: true, fuel: true, water: true, move: true },
    ...over,
  };
}

describe("pact day", () => {
  it("counts a 1 a.m. glass toward the night before", () => {
    const late = { id: "b", ml: 250, at: "2026-09-23T06:00:00.000Z" }; // 01:00 Chicago
    assert.equal(onPactDay([late], "2026-09-22", ZONE).length, 1);
    assert.equal(onPactDay([late], "2026-09-23", ZONE).length, 0);
  });

  it("leaves the same day untouched and returns the same object", () => {
    const s = slice();
    assert.equal(rollPactDay(s, GOALS, DAY1, ZONE), s);
  });

  it("opens all four boxes on a new day and keeps yesterday's rows", () => {
    const s = slice();
    const next = rollPactDay(s, GOALS, DAY2, ZONE);
    assert.equal(next.day, pactToday(DAY2, ZONE));
    assert.deepEqual(next.checkins, { sleep: false, fuel: false, water: false, move: false });
    assert.equal(next.waterMl, 0);
    assert.equal(next.sleepMin, 0);
    assert.equal(next.sleepSource, null);
    assert.equal(next.strain, 0);
    assert.equal(next.readingMin, 0);
    assert.equal(next.waterLog?.length, 1);
    assert.equal(next.meals.length, 1);
  });

  it("rebuilds today's boxes from rows already logged today", () => {
    const s = slice({
      waterLog: [
        { id: "a", ml: 3000, at: DAY1.toISOString() },
        { id: "b", ml: 3000, at: DAY2.toISOString() },
      ],
      meals: [{ at: DAY2.toISOString(), protein: 160 }],
      workoutLogs: [{ at: DAY2.toISOString(), minutes: 45 }],
    });
    const next = rollPactDay(s, GOALS, DAY2, ZONE);
    assert.equal(next.waterMl, 3000);
    assert.equal(next.strain, 2.3);
    assert.deepEqual(next.checkins, { sleep: false, fuel: true, water: true, move: true });
  });

  it("dates an older account once without dropping what it cannot date", () => {
    const s = slice({ day: undefined, sleepSource: undefined });
    const next = rollPactDay(s, GOALS, DAY2, ZONE);
    assert.equal(next.day, "2026-09-23");
    assert.equal(next.sleepMin, 480);
    assert.equal(next.sleepSource, "user");
    assert.equal(next.checkins.sleep, true);
    assert.equal(next.checkins.water, false);
    assert.equal(next.waterMl, 0);
  });

  it("never rolls sample data", () => {
    const s = slice({ demo: true });
    assert.equal(rollPactDay(s, GOALS, DAY2, ZONE), s);
  });
});
