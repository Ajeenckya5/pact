import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { kindFromScene, marketIdForPantry, workoutCandidateLabels, workoutForLabel } from "./app-vision";

describe("app vision routing", () => {
  test("plated food is food, not a gym", () => {
    assert.equal(kindFromScene("a plated meal of cooked food", 0.7), "food");
    assert.equal(kindFromScene("weightlifting a gym machine or an exercise", 0.6), "workout");
    assert.equal(kindFromScene("a supermarket or grocery store building", 0.55), "place-grocery");
    assert.equal(kindFromScene("the exterior of a gym or fitness studio", 0.5), "place-gym");
    assert.equal(kindFromScene("a plated meal of cooked food", 0.05), "other");
  });

  test("lift titles map onto library rows", () => {
    assert.ok(workoutCandidateLabels().length > 40);
    const squat = workoutForLabel("Barbell back squat");
    assert.equal(squat?.id, "lift-squat");
  });

  test("market cart ids only exist on the grocery list", () => {
    assert.equal(marketIdForPantry("salmon"), "salmon");
    assert.equal(marketIdForPantry("this-is-not-an-ingredient"), undefined);
  });
});
