import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createSigningKey, openEnvelope, pactHeaders, sealEnvelope } from "../../../packages/core/src/seal";
import { foreignFields, localEpoch, localHour, readableHealth, type Flags, type PactEnvelope } from "../../../packages/core/src/wire";
import { retain, roomFetch, type RoomCtx, type RoomStorage } from "./room";

const flagsOn: Flags = { realtime: "on", moments: "on", sync: "on" };

function memory(): RoomStorage & { dump(): Map<string, unknown> } {
  const map = new Map<string, unknown>();
  return {
    async get<T>(key: string) {
      return map.get(key) as T | undefined;
    },
    async put(key: string, value: unknown) {
      map.set(key, value);
    },
    async delete(key: string) {
      map.delete(key);
    },
    async list<T>(options?: { prefix?: string }) {
      const prefix = options?.prefix ?? "";
      const out = new Map<string, T>();
      for (const [key, value] of map) {
        if (key.startsWith(prefix)) out.set(key, value as T);
      }
      return out;
    },
    dump() {
      return map;
    },
  };
}

function ctx(): RoomCtx & { sent: string[]; storage: ReturnType<typeof memory> } {
  const sent: string[] = [];
  const storage = memory();
  return {
    storage,
    sent,
    getWebSockets: () => [{ send: (data) => sent.push(data) }],
  };
}

async function post(
  room: ReturnType<typeof ctx>,
  keys: { pk: string; sk: string },
  envelope: PactEnvelope,
  now: number,
  offsetMin: number,
  flag: Flags = flagsOn,
) {
  const body = JSON.stringify(envelope);
  const path = `/pacts/${envelope.pactId}/messages`;
  const headers = await pactHeaders(keys, { method: "POST", path, body, now, offsetMin });
  return roomFetch(
    room,
    new Request(`https://pact.test${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body,
    }),
    flag,
    { now: () => now },
  );
}

describe("pact room durable log", () => {
  it("stores and transmits only envelope fields", async () => {
    const room = ctx();
    const keys = await createSigningKey();
    const now = Date.UTC(2026, 8, 23, 18, 0, 0);
    const offsetMin = 0;
    const payload = { sleep: true, water: 800, box: "liter", value: 1, time: "20:00", heartRate: 62 };
    const envelope = await sealEnvelope({
      inviteSecret: "shared-secret",
      pactId: "p1",
      senderPk: keys.pk,
      senderSk: keys.sk,
      kind: "boxes",
      payload,
      now,
      offsetMin,
    });
    const response = await post(room, keys, envelope, now, offsetMin);
    assert.equal(response.status, 201);
    const stored = [...room.storage.dump().values()].find((value) => value && typeof value === "object" && "ct" in (value as object)) as PactEnvelope;
    const transmitted = JSON.parse(room.sent[0] ?? "{}") as PactEnvelope;
    for (const record of [stored, transmitted]) {
      assert.deepEqual(foreignFields(record), []);
      assert.equal(readableHealth(JSON.stringify(record)), false);
      assert.throws(() => JSON.parse(new TextDecoder().decode(b64(record.ct))));
    }
    assert.deepEqual(await openEnvelope("shared-secret", stored), payload);
    assert.equal(stored.senderPk, keys.pk);
  });

  it("rejects a readable field next to the envelope and an unsigned request", async () => {
    const room = ctx();
    const keys = await createSigningKey();
    const now = Date.UTC(2026, 8, 23, 18, 0, 0);
    const envelope = await sealEnvelope({
      inviteSecret: "shared-secret",
      pactId: "p1",
      senderPk: keys.pk,
      senderSk: keys.sk,
      kind: "boxes",
      payload: { sleep: false },
      now,
      offsetMin: 0,
    });
    const dirty = JSON.stringify({ ...envelope, sleep: 8, box: "plain" });
    const headers = await pactHeaders(keys, { method: "POST", path: "/pacts/p1/messages", body: dirty, now, offsetMin: 0 });
    const rejected = await roomFetch(
      room,
      new Request("https://pact.test/pacts/p1/messages", {
        method: "POST",
        headers: { "content-type": "application/json", ...headers },
        body: dirty,
      }),
      flagsOn,
      { now: () => now },
    );
    assert.equal(rejected.status, 400);
    assert.equal(room.sent.length, 0);
    const unsigned = await roomFetch(
      room,
      new Request("https://pact.test/pacts/p1/messages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(envelope),
      }),
      flagsOn,
      { now: () => now },
    );
    assert.equal(unsigned.status, 401);
  });

  it("rejects a signature older than 60 seconds", async () => {
    const room = ctx();
    const keys = await createSigningKey();
    const now = Date.UTC(2026, 8, 23, 18, 0, 0);
    const envelope = await sealEnvelope({
      inviteSecret: "shared-secret",
      pactId: "p1",
      senderPk: keys.pk,
      senderSk: keys.sk,
      kind: "chat",
      payload: { text: "here" },
      now,
      offsetMin: 0,
    });
    const response = await post(room, keys, envelope, now, 0, flagsOn);
    assert.equal(response.status, 201);
    const staleHeaders = await pactHeaders(keys, {
      method: "POST",
      path: "/pacts/p1/messages",
      body: JSON.stringify(envelope),
      now,
      offsetMin: 0,
    });
    const stale = await roomFetch(
      room,
      new Request("https://pact.test/pacts/p1/messages", {
        method: "POST",
        headers: { "content-type": "application/json", ...staleHeaders },
        body: JSON.stringify(envelope),
      }),
      flagsOn,
      { now: () => now + 61_000 },
    );
    assert.equal(stale.status, 401);
  });

  it("caps nudges at 3 and keeps quiet hours", async () => {
    const keys = await createSigningKey();
    const noon = Date.UTC(2026, 8, 23, 12, 0, 0);
    assert.equal(localHour(noon, 0), 12);
    const quietNow = Date.UTC(2026, 8, 23, 12, 0, 0);
    const quietOffset = 11 * 60;
    assert.equal(localHour(quietNow, quietOffset), 23);
    const room = ctx();
    const quiet = await sealEnvelope({
      inviteSecret: "shared-secret",
      pactId: "p1",
      senderPk: keys.pk,
      senderSk: keys.sk,
      kind: "nudge",
      payload: {},
      now: quietNow,
      offsetMin: quietOffset,
    });
    const denied = await post(room, keys, quiet, quietNow, quietOffset);
    assert.equal(denied.status, 403);

    const morning = Date.UTC(2026, 8, 23, 6, 30, 0);
    assert.equal(localHour(morning, 0), 6);
    const early = await sealEnvelope({
      inviteSecret: "shared-secret",
      pactId: "p1",
      senderPk: keys.pk,
      senderSk: keys.sk,
      kind: "nudge",
      payload: {},
      now: morning,
      offsetMin: 0,
    });
    assert.equal((await post(room, keys, early, morning, 0)).status, 403);

    for (let i = 0; i < 3; i += 1) {
      const stamp = noon + i * 1000;
      const envelope = await sealEnvelope({
        inviteSecret: "shared-secret",
        pactId: "p1",
        senderPk: keys.pk,
        senderSk: keys.sk,
        kind: "nudge",
        payload: { n: i },
        now: stamp,
        offsetMin: 0,
      });
      assert.equal((await post(room, keys, envelope, stamp, 0)).status, 201);
    }
    const fourth = await sealEnvelope({
      inviteSecret: "shared-secret",
      pactId: "p1",
      senderPk: keys.pk,
      senderSk: keys.sk,
      kind: "nudge",
      payload: { n: 4 },
      now: noon + 4000,
      offsetMin: 0,
    });
    assert.equal((await post(room, keys, fourth, noon + 4000, 0)).status, 429);
    assert.equal(room.sent.length, 3);
  });

  it("keeps an ordered log and drops events older than 30 days", async () => {
    const room = ctx();
    const keys = await createSigningKey();
    const now = Date.UTC(2026, 8, 23, 15, 0, 0);
    const first = await sealEnvelope({
      inviteSecret: "s",
      pactId: "p1",
      senderPk: keys.pk,
      senderSk: keys.sk,
      kind: "seen",
      payload: { threadId: "a", messageId: "m" },
      now,
      offsetMin: 0,
    });
    const second = await sealEnvelope({
      inviteSecret: "s",
      pactId: "p1",
      senderPk: keys.pk,
      senderSk: keys.sk,
      kind: "seen",
      payload: { threadId: "a", messageId: "n" },
      now: now + 1000,
      offsetMin: 0,
    });
    assert.equal((await post(room, keys, first, now, 0)).status, 201);
    assert.equal((await post(room, keys, second, now + 1000, 0)).status, 201);
    const keysInOrder = [...room.storage.dump().keys()].filter((key) => key.startsWith("log:")).sort();
    assert.deepEqual(keysInOrder, ["log:00000001", "log:00000002"]);
    await room.storage.put("log:00000000", { ...first, epoch: 20200101 });
    await retain(room.storage, localEpoch(now, 0));
    assert.equal(room.storage.dump().has("log:00000000"), false);
    assert.equal(room.storage.dump().has("log:00000001"), true);
  });

  it("does not push when realtime is off", async () => {
    const room = ctx();
    const keys = await createSigningKey();
    const now = Date.UTC(2026, 8, 23, 15, 0, 0);
    const envelope = await sealEnvelope({
      inviteSecret: "s",
      pactId: "p1",
      senderPk: keys.pk,
      senderSk: keys.sk,
      kind: "boxes",
      payload: { move: true },
      now,
      offsetMin: 0,
    });
    const response = await post(room, keys, envelope, now, 0, { realtime: "off", moments: "on", sync: "on" });
    assert.equal(response.status, 201);
    assert.equal(room.sent.length, 0);
  });
});

function b64(value: string) {
  const pad = value.length % 4 === 0 ? "" : "=".repeat(4 - (value.length % 4));
  const bin = atob(value.replaceAll("-", "+").replaceAll("_", "/") + pad);
  return Uint8Array.from(bin, (char) => char.charCodeAt(0));
}
