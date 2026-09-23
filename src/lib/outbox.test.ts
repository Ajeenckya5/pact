import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyFlush, type OutItem } from "./outbox";

describe("outbox", () => {
  it("drops a delivered item and marks a failed one for retry", () => {
    const items: OutItem[] = [
      { id: "a", status: "pending", body: { v: 1, pactId: "p", epoch: 20260923, senderPk: "pk", kind: "boxes", nonce: "a", ct: "ciphertext-a", sig: "sig-a" } },
      { id: "b", status: "pending", body: { v: 1, pactId: "p", epoch: 20260923, senderPk: "pk", kind: "boxes", nonce: "b", ct: "ciphertext-b", sig: "sig-b" } },
    ];
    const next = applyFlush(items, { a: true, b: false });
    assert.deepEqual(next.items.map((item) => item.id), ["b"]);
    assert.equal(next.items[0].status, "failed");
    assert.equal(next.failed, 1);
  });
});
