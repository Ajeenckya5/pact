import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { openMessage, sealMessage } from "../../../packages/core/src/crypto";
import { handleRequest, setAttestRequired } from "./index";

describe("two people, one pact", () => {
  after(() => setAttestRequired(false));

  it("delivers a sealed check-in and rejects plaintext", async () => {
    const secret = "shared-invite-secret";
    const box = await sealMessage(secret, JSON.stringify({ water: true, sleep: false }));
    assert.equal(box.includes('"water"'), false);
    const posted = await handleRequest(
      new Request("https://pact.test/pacts/pact-1/messages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ v: 1, pactId: "pact-1", sender: "ava", box }),
      }),
    );
    assert.equal(posted.status, 201);
    const rejected = await handleRequest(
      new Request("https://pact.test/pacts/pact-1/messages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ v: 1, pactId: "pact-1", sender: "ava", text: "hello", box }),
      }),
    );
    assert.equal(rejected.status, 400);
    const listed = await handleRequest(new Request("https://pact.test/pacts/pact-1/messages"));
    const payload = (await listed.json()) as { messages: Array<{ box: string }> };
    assert.equal(await openMessage(secret, payload.messages[0].box), JSON.stringify({ water: true, sleep: false }));
  });

  it("rejects a missing attestation when that check is on", async () => {
    setAttestRequired(true);
    const res = await handleRequest(
      new Request("https://pact.test/pacts/pact-2/messages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ v: 1, pactId: "pact-2", sender: "ava", box: "abcdefghijklmnopqrstuvwxyz" }),
      }),
    );
    assert.equal(res.status, 401);
    setAttestRequired(false);
  });
});
