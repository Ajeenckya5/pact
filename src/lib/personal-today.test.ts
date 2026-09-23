import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { celebrationMode, personalToday } from "./personal-today";

describe("personal today", () => {
  it("names the water still left before 20:00", () => {
    const line = personalToday({
      call: "train",
      hour: 15,
      waterMl: 2400,
      waterGoal: 3200,
      proteinLeft: 40,
      boxesOpen: 2,
      empty: false,
    });
    assert.equal(line.headline, "800 ml to go before 20:00");
    assert.match(line.detail, /train/);
    assert.match(line.detail, /40g protein/);
  });

  it("celebrates when every box is in, and stays quiet with reduced motion", () => {
    const line = personalToday({
      call: "recover",
      hour: 21,
      waterMl: 3200,
      waterGoal: 3200,
      proteinLeft: 0,
      boxesOpen: 0,
      empty: false,
    });
    assert.equal(line.headline, "All four boxes are in.");
    assert.equal(celebrationMode(true, true), "quiet");
    assert.equal(celebrationMode(false, true), "full");
    assert.equal(celebrationMode(false, false), "off");
  });
});
