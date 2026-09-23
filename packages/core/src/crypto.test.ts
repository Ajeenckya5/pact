import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createDeviceKeys, inviteProof, openSeal, parseInviteFragment, sealTo } from "./crypto";

describe("sealed messages", () => {
  it("round-trips a pact key and hides it from the box string", async () => {
    const alice = await createDeviceKeys();
    const secret = new TextEncoder().encode("pact-key-demo");
    const sealed = await sealTo(alice.x25519.publicKey, secret);
    assert.equal(sealed.box.includes("pact-key-demo"), false);
    const opened = await openSeal(alice.x25519.privateKey, sealed);
    assert.equal(new TextDecoder().decode(opened), "pact-key-demo");
  });

  it("reads an invite from the fragment only", async () => {
    const parsed = parseInviteFragment("#abc.secret-value");
    assert.deepEqual(parsed, { pactId: "abc", inviteSecret: "secret-value" });
    const proof = await inviteProof("secret-value", "abc");
    assert.equal(proof, await inviteProof("secret-value", "abc"));
    assert.notEqual(proof, await inviteProof("other", "abc"));
  });
});
