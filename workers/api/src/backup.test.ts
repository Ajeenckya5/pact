import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { backupCiphertext } from "./backup";

describe("personal backup", () => {
  test("accepts a single ciphertext field", () => {
    const ct = "A".repeat(32);
    assert.equal(backupCiphertext({ ct }), ct);
  });

  test("rejects plaintext health fields", () => {
    assert.equal(backupCiphertext({ ct: "A".repeat(32), kcal: 100 }), null);
    assert.equal(backupCiphertext({ meals: [{ name: "oats" }] }), null);
    assert.equal(backupCiphertext({ ct: "short" }), null);
    assert.equal(backupCiphertext(null), null);
  });
});
