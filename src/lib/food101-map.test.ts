import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { foodCandidateLabels, humanizeFood101, pantryIdForFood101, pantryIdForVisionLabel } from "./food101-map";
import { PANTRY_BY_ID } from "./pantry";

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

  test("candidate labels cover the pantry, not just 101 dishes", () => {
    const labels = foodCandidateLabels();
    assert.ok(labels.length > 400, `got ${labels.length}`);
    assert.ok(labels.includes("Atlantic salmon"));
    assert.ok(labels.includes("Grilled Salmon"));
  });
});
