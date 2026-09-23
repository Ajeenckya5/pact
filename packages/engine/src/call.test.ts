import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { dailyCall, recoveryAgeReady } from "./index";

describe("daily call", () => {
  it("caps a sick day at recover", () => {
    const call = dailyCall({ sick: true, measured: true, recovery: 90, strain: 4, sleepScore: 90 });
    assert.equal(call.call, "recover");
  });

  it("does not treat missing scores as a protect day", () => {
    const call = dailyCall({ measured: false, recovery: 0, strain: 0, sleepScore: 0 });
    assert.equal(call.call, "train");
  });
});

describe("recovery age", () => {
  it("stays hidden before 14 nights", () => {
    assert.equal(recoveryAgeReady(13), false);
    assert.equal(recoveryAgeReady(14), true);
  });
});
