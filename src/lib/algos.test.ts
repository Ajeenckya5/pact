import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  ATWATER,
  PACT_WEIGHTS,
  atwaterKcal,
  combinePactScore,
  cosine,
  haversineKm,
  scalePer100,
  softmax,
  strainFromBle,
} from "./algos";
import { derivedKcal, scalePantry, type PantryItem } from "./pantry";

describe("Atwater", () => {
  test("kcal = 4P + 4C + 9F", () => {
    assert.equal(atwaterKcal(30, 40, 10), 4 * 30 + 4 * 40 + 9 * 10);
    assert.equal(ATWATER.protein, 4);
    assert.equal(ATWATER.carbs, 4);
    assert.equal(ATWATER.fat, 9);
  });

  test("derivedKcal matches Atwater", () => {
    assert.equal(derivedKcal(53, 0, 6), atwaterKcal(53, 0, 6));
  });
});

describe("pantry scale", () => {
  test("macros_logged = per100 × grams / 100", () => {
    const chicken: PantryItem = {
      id: "chicken",
      name: "Chicken breast",
      group: "Meat",
      aisle: "Meat",
      aliases: [],
      kcal100: 165,
      protein100: 31,
      carbs100: 0,
      fat100: 3.6,
      servingG: 170,
      servingLabel: "170g cooked",
    };
    assert.ok(chicken);
    const macros = scalePantry(chicken, 170);
    assert.equal(macros.kcal, scalePer100(chicken.kcal100, 170));
    assert.equal(macros.protein, scalePer100(chicken.protein100, 170));
    assert.equal(macros.carbs, scalePer100(chicken.carbs100, 170));
    assert.equal(macros.fat, scalePer100(chicken.fat100, 170));
    assert.equal(macros.kcal, Math.round(165 * 1.7));
  });
});

describe("haversine", () => {
  test("1° of longitude at the equator is ~111.195 km", () => {
    const km = haversineKm({ lat: 0, lng: 0 }, { lat: 0, lng: 1 });
    assert.ok(Math.abs(km - 111.195) < 0.02, `got ${km}`);
  });

  test("identical points are 0", () => {
    assert.equal(haversineKm({ lat: 37.77, lng: -122.42 }, { lat: 37.77, lng: -122.42 }), 0);
  });
});

describe("pact score", () => {
  test("weights sum to 1", () => {
    const sum =
      PACT_WEIGHTS.recovery +
      PACT_WEIGHTS.sleep +
      PACT_WEIGHTS.fuelProtein +
      PACT_WEIGHTS.hydro +
      PACT_WEIGHTS.move +
      PACT_WEIGHTS.checkins;
    assert.equal(Math.round(sum * 1000) / 1000, 1);
  });

  test("all-100 inputs yield 100", () => {
    assert.equal(
      combinePactScore({
        recovery: 100,
        sleepScore: 100,
        fuel: 100,
        protein: 100,
        hydro: 100,
        move: 100,
        pactDone: 100,
      }),
      100,
    );
  });
});

describe("strain from BLE", () => {
  test("unpaired HR does not raise strain", () => {
    assert.equal(strainFromBle(8, 51, null, null), 8);
  });

  test("HR 140 at RHR 51 raises strain by (140-51-28)/10", () => {
    assert.equal(strainFromBle(8, 51, 140, null), 8 + (140 - 51 - 28) / 10);
  });

  test("power 180 W raises strain by 180/45", () => {
    assert.equal(strainFromBle(8, 51, null, 180), 8 + 180 / 45);
  });

  test("caps at 21", () => {
    assert.equal(strainFromBle(8, 40, 220, 900), 21);
  });
});

describe("linear algebra", () => {
  test("cosine of identical vectors is 1", () => {
    assert.ok(Math.abs(cosine([1, 2, 3], [1, 2, 3]) - 1) < 1e-12);
  });

  test("softmax sums to 1", () => {
    const s = softmax([1.2, 0.4, 0.1]);
    assert.ok(Math.abs(s.reduce((a, b) => a + b, 0) - 1) < 1e-12);
    assert.ok(s[0] > s[1] && s[1] > s[2]);
  });
});
