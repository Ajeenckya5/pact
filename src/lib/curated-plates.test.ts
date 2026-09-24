import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { scalePer100 } from "./algos";
import { curatedPlates } from "../../workers/api/src/plates";
import { PANTRY_BY_ID } from "../../workers/api/src/pantry-data";

describe("curated plates", () => {
  it("builds 150 plates from pantry macros", () => {
    const plates = curatedPlates();
    assert.equal(plates.length, 150);
    assert.equal(new Set(plates.map((plate) => plate.id)).size, 150);
    assert.equal(plates.every((plate) => plate.source === "pact"), true);
    const first = plates[0];
    const chicken = scalePer100(PANTRY_BY_ID.chicken.kcal100, 170);
    const rice = scalePer100(PANTRY_BY_ID.rice.kcal100, 160);
    const broccoli = scalePer100(PANTRY_BY_ID.broccoli.kcal100, 120);
    assert.equal(first.lines[0].kcal, chicken);
    assert.equal(first.lines[1].kcal, rice);
    assert.equal(first.lines[2].kcal, broccoli);
    assert.equal(first.kcal, chicken + rice + broccoli);
  });
});
