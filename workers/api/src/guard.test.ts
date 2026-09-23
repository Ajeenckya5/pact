import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PactRoom } from "./guard";

describe("pact room", () => {
  it("stores ciphertext and rejects health values and plaintext", () => {
    const room = new PactRoom();
    room.post({ v: 1, pactId: "p1", sender: "alice", box: "aabbccddeeff00112233445566778899" });
    assert.equal(room.messages.length, 1);
    assert.throws(() => room.post({ v: 1, pactId: "p1", sender: "alice", text: "meet at 6", box: "aabbccddeeff00112233445566778899" }));
    assert.throws(() => room.post({ v: 1, pactId: "p1", sender: "alice", recovery: 86, box: "aabbccddeeff00112233445566778899" }));
    room.wipe();
    assert.equal(room.messages.length, 0);
  });
});
