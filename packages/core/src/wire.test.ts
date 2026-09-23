import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createBoxKey, createEpochKey, createSigningKey, openEnvelope, openEpochKey, sealEnvelope, sealEpochKey } from "./seal";
import { localHour, nudgeDecision, shouldSendReceipt } from "./wire";

describe("envelope and nudge policy", () => {
  it("round-trips health values inside ct", async () => {
    const keys = await createSigningKey();
    const epochKey = await createEpochKey();
    const envelope = await sealEnvelope({
      epochKey,
      pactId: "p1",
      senderPk: keys.pk,
      senderSk: keys.sk,
      kind: "boxes",
      payload: { sleep: true, water: 800 },
      now: Date.UTC(2026, 8, 23, 15, 0, 0),
      offsetMin: 0,
    });
    assert.equal(JSON.stringify(envelope).includes('"sleep"'), false);
    assert.deepEqual(await openEnvelope(epochKey, envelope), { sleep: true, water: 800 });
  });

  it("does not use the invite secret as the content key", async () => {
    const sodium = (await import("libsodium-wrappers")).default;
    await sodium.ready;
    const keys = await createSigningKey();
    const epochKey = await createEpochKey();
    const inviteSecret = "invite-secret";
    const envelope = await sealEnvelope({
      epochKey,
      pactId: "p1",
      senderPk: keys.pk,
      senderSk: keys.sk,
      kind: "boxes",
      payload: { sleep: true },
      now: Date.UTC(2026, 8, 23, 15, 0, 0),
      offsetMin: 0,
    });
    const fromInvite = sodium.crypto_generichash(32, sodium.from_string(inviteSecret), sodium.from_string("pact-xchacha-v1"));
    assert.equal(Buffer.from(fromInvite).equals(Buffer.from(epochKey)), false);
    await assert.rejects(() => openEnvelope(fromInvite, envelope));
    assert.deepEqual(await openEnvelope(epochKey, envelope), { sleep: true });
  });

  it("opens content with the per-epoch key sealed to a member", async () => {
    const member = await createBoxKey();
    const epochKey = await createEpochKey();
    const box = await sealEpochKey(epochKey, member.publicKey);
    const opened = await openEpochKey(box, member.publicKey, member.secretKey);
    assert.deepEqual(opened, epochKey);
    const keys = await createSigningKey();
    const envelope = await sealEnvelope({
      epochKey: opened,
      pactId: "p1",
      senderPk: keys.pk,
      senderSk: keys.sk,
      kind: "chat",
      payload: { text: "here" },
      now: Date.UTC(2026, 8, 23, 15, 0, 0),
      offsetMin: 0,
    });
    assert.deepEqual(await openEnvelope(opened, envelope), { text: "here" });
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