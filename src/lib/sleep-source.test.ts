import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyDeviceSleep,
  applySleep,
  hoursFromMinutes,
  isDeviceSleep,
  resolveSleepSave,
  sleepSourceLabel,
} from "./sleep-source";

const open = { sleep: false, fuel: false, water: false, move: false };

describe("sleep source", () => {
  it("names where the number came from", () => {
    assert.equal(sleepSourceLabel("healthkit"), "From Apple Health");
    assert.equal(sleepSourceLabel("health-connect"), "From Health Connect");
    assert.equal(sleepSourceLabel("strap"), "From your strap");
    assert.equal(sleepSourceLabel("user"), "Logged by you");
    assert.equal(sleepSourceLabel("demo"), "Sample data");
    assert.equal(sleepSourceLabel("mystery"), "From your device");
    assert.equal(sleepSourceLabel(null), "Not logged yet");
  });

  it("treats only unedited device or sample hours as device sleep", () => {
    assert.equal(isDeviceSleep("healthkit", 444), true);
    assert.equal(isDeviceSleep("demo", 442), true);
    assert.equal(isDeviceSleep("user", 444), false);
    assert.equal(isDeviceSleep("healthkit", 0), false);
    assert.equal(isDeviceSleep(null, 444), false);
  });

  it("keeps the device as the source when its hours are saved as shown", () => {
    const shown = hoursFromMinutes(444); // 7.4
    assert.deepEqual(resolveSleepSave({ sleepMin: 444, sleepSource: "healthkit", hours: shown }), {
      minutes: 444,
      source: "healthkit",
    });
  });

  it("stores a correction as the user's own entry", () => {
    assert.deepEqual(resolveSleepSave({ sleepMin: 444, sleepSource: "healthkit", hours: 6 }), {
      minutes: 360,
      source: "user",
    });
    assert.deepEqual(resolveSleepSave({ sleepMin: 0, sleepSource: null, hours: 7.5 }), {
      minutes: 450,
      source: "user",
    });
  });

  it("rejects empty, negative, and impossible hours", () => {
    for (const hours of [0, 0.2, -1, Number.NaN, 17, Number.POSITIVE_INFINITY]) {
      assert.equal(resolveSleepSave({ sleepMin: 0, sleepSource: null, hours }), null);
    }
  });

  it("ticks the box at 7 hours and not before", () => {
    assert.equal(applySleep({ sleepMin: 0, checkins: open }, 419, "user").checkins.sleep, false);
    assert.equal(applySleep({ sleepMin: 0, checkins: open }, 420, "user").checkins.sleep, true);
  });

  it("never lets a device sync overwrite the user's correction", () => {
    const corrected = applySleep({ sleepMin: 444, sleepSource: "healthkit", checkins: open }, 360, "user");
    const synced = applyDeviceSleep(corrected, 500, "healthkit");
    assert.equal(synced, corrected);
    const fresh = applyDeviceSleep({ sleepMin: 0, sleepSource: null, checkins: open }, 500, "oura");
    assert.equal(fresh.sleepSource, "oura");
    assert.equal(fresh.checkins.sleep, true);
  });
});
