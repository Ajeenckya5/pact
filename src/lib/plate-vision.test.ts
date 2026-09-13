import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  extractFeatures,
  foodTokens,
  paintMix,
  paintSolid,
  rankPlate,
} from "./plate-vision";

describe("filename tokens", () => {
  test("strips camera junk and keeps food words", () => {
    assert.deepEqual(foodTokens("IMG_2048.jpg"), []);
    assert.deepEqual(foodTokens("PXL_20260912_chicken.jpg"), ["chicken"]);
    assert.ok(foodTokens("lunch-salmon-bowl.png").includes("salmon"));
  });
});

describe("plate vision", () => {
  test("a green plate ranks salad or broccoli, not oatmeal", () => {
    const features = extractFeatures(paintSolid(96, 96, [40, 150, 55]));
    assert.ok(features.green > 0.5, `green=${features.green}`);
    const scan = rankPlate({ features, filename: "IMG_2048.jpg", hour: 8 });
    const id = scan.ranked[0]?.id;
    assert.ok(id === "salad" || id === "broccoli", `got ${id}`);
    assert.notEqual(id, "oats");
    assert.notEqual(id, "yogurt");
  });

  test("filename chicken beats breakfast hour on a green plate", () => {
    const features = extractFeatures(paintSolid(96, 96, [40, 150, 55]));
    const scan = rankPlate({ features, filename: "grilled-chicken.jpg", hour: 8 });
    assert.equal(scan.ranked[0]?.id, "chicken");
    assert.ok(!scan.unsure);
  });

  test("steak colors at 8am are not yogurt", () => {
    const features = extractFeatures(
      paintMix(96, 96, [
        { rgb: [150, 48, 38], weight: 0.25 },
        { rgb: [95, 42, 30], weight: 0.5 },
        { rgb: [38, 20, 14], weight: 0.25 },
      ]),
    );
    const scan = rankPlate({ features, filename: "DSC01234.jpg", hour: 8 });
    const id = scan.ranked[0]?.id;
    assert.ok(id === "steak" || id === "burger", `got ${id}`);
    assert.notEqual(id, "yogurt");
    assert.notEqual(id, "oats");
  });

  test("camera filename with no pixels is unsure", () => {
    const scan = rankPlate({ filename: "IMG_0001.jpg", hour: 19 });
    assert.equal(scan.unsure, true);
    assert.equal(scan.top, null);
    assert.ok(!scan.ranked.some((r) => r.softmax > 0.9));
  });

  test("CLIP grilled salmon at breakfast is salmon, not yogurt", () => {
    const scan = rankPlate({
      filename: "IMG_2048.jpg",
      hour: 8,
      net: [
        { label: "grilled_salmon", score: 0.81 },
        { label: "steak", score: 0.07 },
        { label: "frozen_yogurt", score: 0.04 },
      ],
    });
    assert.equal(scan.engine, "clip");
    assert.equal(scan.ranked[0]?.pantryId, "salmon");
    assert.equal(scan.unsure, false);
    assert.ok(scan.ranked[0] && scan.ranked[0].kcal > 0);
  });

  test("CLIP pantry name Atlantic salmon maps to salmon", () => {
    const scan = rankPlate({
      filename: "IMG_2048.jpg",
      hour: 8,
      net: [
        { label: "Atlantic salmon", score: 0.22 },
        { label: "Chicken breast", score: 0.04 },
      ],
      netInfo: { id: "onnx-community/CLIP-ViT-B-32-laion2B-s34B-b79K-ONNX", dataset: "LAION-2B (2 billion image–text pairs)" },
    });
    assert.equal(scan.engine, "clip");
    assert.equal(scan.ranked[0]?.pantryId, "salmon");
    assert.match(scan.proof.join("\n"), /LAION-2B/);
  });

  test("weak CLIP scores stay unsure", () => {
    const scan = rankPlate({
      filename: "IMG_1.jpg",
      hour: 19,
      net: [{ label: "apple_pie", score: 0.02 }],
    });
    assert.equal(scan.unsure, true);
    assert.equal(scan.top, null);
  });

  test("Atwater on the winner matches 4P+4C+9F", () => {
    const features = extractFeatures(paintSolid(64, 64, [40, 150, 55]));
    const scan = rankPlate({ features, filename: "salad.jpg", hour: 13 });
    const top = scan.ranked[0];
    assert.ok(top);
    assert.equal(top.atwaterKcal, Math.round(4 * top.protein + 4 * top.carbs + 9 * top.fat));
  });
});
