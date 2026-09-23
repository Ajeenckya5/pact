import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { localDateKey, streakEnding } from "./streak";

describe("streaks", () => {
  it("keeps a New York streak across the spring-forward Sunday", () => {
    const zone = "America/New_York";
    const saturday = localDateKey(new Date("2026-03-07T15:00:00.000Z"), zone);
    const sundayEarly = localDateKey(new Date("2026-03-08T05:30:00.000Z"), zone);
    const monday = localDateKey(new Date("2026-03-09T15:00:00.000Z"), zone);
    assert.deepEqual([saturday, sundayEarly, monday], ["2026-03-07", "2026-03-08", "2026-03-09"]);
    assert.equal(streakEnding([saturday, sundayEarly, monday], monday), 3);
  });

  it("breaks when a day is missing", () => {
    assert.equal(streakEnding(["2026-09-20", "2026-09-22"], "2026-09-22"), 1);
  });
});
