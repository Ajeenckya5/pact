import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { FOOD_CACHE_MAX, cachedFoods, rememberFoods, type PantryItem } from "./pantry";

function item(id: string): PantryItem {
  return {
    id,
    name: id,
    group: "Snack",
    aisle: "Snack",
    aliases: [],
    kcal100: 100,
    protein100: 1,
    carbs100: 10,
    fat100: 1,
    servingG: 30,
    servingLabel: "30g",
  };
}

describe("food cache", () => {
  test("keeps at most 200 foods and prefers favorites", () => {
    const favorite = item("favorite-food");
    const crowd = Array.from({ length: 210 }, (_, index) => item(`food-${index}`));
    const kept = rememberFoods([favorite, ...crowd], [favorite.id]);
    assert.equal(kept.length, FOOD_CACHE_MAX);
    assert.equal(cachedFoods().length, FOOD_CACHE_MAX);
    assert.ok(cachedFoods().some((food) => food.id === favorite.id));
  });

  test("the client module does not contain the catalog", () => {
    const src = readFileSync(new URL("./pantry.ts", import.meta.url), "utf8");
    assert.equal(src.includes("chicken|Chicken breast"), false);
    const vision = readFileSync(new URL("./plate-vision.ts", import.meta.url), "utf8");
    assert.equal(vision.includes("./plate-net"), false);
    assert.equal(vision.includes("@huggingface/transformers"), false);
  });
});
