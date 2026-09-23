import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { localDateKey, pactDateKey, streakEnding } from "./streak";

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

  it("counts a 2am log on the previous pact day", () => {
    const zone = "UTC";
    const early = new Date("2026-09-23T02:00:00.000Z");
    const after = new Date("2026-09-23T04:00:00.000Z");
    assert.equal(pactDateKey(early, zone), "2026-09-22");
    assert.equal(pactDateKey(after, zone), "2026-09-23");
  });
});
