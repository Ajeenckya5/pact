import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { searchPantry } from "./pantry";

const FOODS = ["paneer", "dal", "poha", "idli", "egusi", "jollof", "quark", "bratwurst", "tteokbokki", "arepa"];

describe("regional foods", () => {
  it("finds everyday foods by their usual names", () => {
    for (const name of FOODS) {
      const hits = searchPantry(name);
      assert.ok(hits.length > 0, name);
    }
  });
});
