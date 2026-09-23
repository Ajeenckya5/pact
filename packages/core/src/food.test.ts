import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { foodFromOffPayload, portionOf } from "./food";

describe("barcode foods", () => {
  it("reads an Open Food Facts product and waits for a portion", () => {
    const food = foodFromOffPayload({
      product: {
        code: "123",
        product_name: "Idli",
        nutriments: { "energy-kcal_100g": 140, proteins_100g: 4, carbohydrates_100g: 28, fat_100g: 1 },
      },
    });
    assert.ok(food);
    assert.equal(portionOf(food, 80).kcal, 112);
    assert.equal(foodFromOffPayload({ product: {} }), null);
  });
});