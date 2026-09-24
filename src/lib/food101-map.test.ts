import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { FOOD101_PANTRY, foodCandidateLabels, humanizeFood101, pantryIdForFood101, pantryIdForVisionLabel } from "./food101-map";
import { PANTRY_BY_ID } from "../../workers/api/src/pantry-data";

describe("Food-101 pantry map", () => {
  test("humanizes labels", () => {
    assert.equal(humanizeFood101("grilled_salmon"), "Grilled Salmon");
    assert.equal(humanizeFood101("caesar salad"), "Caesar Salad");
  });

  test("maps common dishes onto pantry rows that exist", () => {
    const ids = [
      pantryIdForFood101("pizza"),
      pantryIdForFood101("hamburger"),
      pantryIdForFood101("grilled_salmon"),
      pantryIdForFood101("steak"),
      pantryIdForFood101("greek_salad"),
      pantryIdForFood101("chicken_wings"),
      pantryIdForFood101("sushi"),
    ];
    assert.deepEqual(ids, ["pizza-slice", "burger", "salmon", "steak", "greek-salad", "chicken-wing", "sushi-roll"]);
    for (const id of ids) {
      assert.ok(id && PANTRY_BY_ID[id], `missing pantry ${id}`);
    }
  });

  test("CLIP pantry names resolve without the 101-class map", () => {
    assert.equal(pantryIdForVisionLabel("Atlantic salmon"), "salmon");
    assert.equal(pantryIdForVisionLabel("Chicken breast"), "chicken");
    assert.equal(pantryIdForVisionLabel("grilled_salmon"), "salmon");
  });

  test("candidate labels are dish titles, not the grocery catalog", () => {
    const labels = foodCandidateLabels();
    assert.ok(labels.length >= Object.keys(FOOD101_PANTRY).length - 5, `got ${labels.length}`);
    assert.ok(labels.includes("Grilled Salmon"));
    assert.equal(labels.some((label) => /egusi/i.test(label)), false);
  });
});
