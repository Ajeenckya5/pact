import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseHeartRate } from "./ble";

describe("heart rate measurement", () => {
  it("reads an 8-bit bpm and RR intervals", () => {
    const sample = parseHeartRate(new Uint8Array([0x10, 72, 0x00, 0x04]));
    assert.equal(sample.bpm, 72);
    assert.equal(sample.rrMs[0], Math.round((1024 / 1024) * 1000));
  });
});
