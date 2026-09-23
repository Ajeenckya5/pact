import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createSigningKey, openEnvelope, sealEnvelope } from "./seal";
import { localHour, nudgeDecision, shouldSendReceipt } from "./wire";

describe("envelope and nudge policy", () => {
  it("round-trips health values inside ct", async () => {
    const keys = await createSigningKey();
    const envelope = await sealEnvelope({
      inviteSecret: "secret",
      pactId: "p1",
      senderPk: keys.pk,
      senderSk: keys.sk,
      kind: "boxes",
      payload: { sleep: true, water: 800 },
      now: Date.UTC(2026, 8, 23, 15, 0, 0),
      offsetMin: 0,
    });
    assert.equal(JSON.stringify(envelope).includes('"sleep"'), false);
    assert.deepEqual(await openEnvelope("secret", envelope), { sleep: true, water: 800 });
  });

  it("caps nudges and respects quiet hours", () => {
    assert.equal(nudgeDecision({ sentToday: 2, hour: 21 }), "ok");
    assert.equal(nudgeDecision({ sentToday: 3, hour: 21 }), "cap");
    assert.equal(nudgeDecision({ sentToday: 0, hour: 22 }), "quiet");
    assert.equal(nudgeDecision({ sentToday: 0, hour: 6 }), "quiet");
    assert.equal(nudgeDecision({ sentToday: 0, hour: 7 }), "ok");
    assert.equal(localHour(Date.UTC(2026, 8, 23, 15, 0, 0), -300), 10);
  });

  it("sends seen receipts only when the setting is on", () => {
    assert.equal(shouldSendReceipt(undefined), true);
    assert.equal(shouldSendReceipt(true), true);
    assert.equal(shouldSendReceipt(false), false);
  });
});