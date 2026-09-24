import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createSigningKey, signBytes } from "../../../packages/core/src/seal";
import { socketCanon } from "../../../packages/core/src/wire";
import { originAllowed } from "./origin";
import { AUTH_MS, beginSocket, consumeSocketAuth, socketTimedOut, type ReplayCache } from "./socket";

function memoryReplay(): ReplayCache & { size: number } {
  const seen = new Set<string>();
  return {
    get size() {
      return seen.size;
    },
    has(sig) {
      return seen.has(sig);
    },
    add(sig) {
      seen.add(sig);
    },
  };
}

describe("socket challenge", () => {
  it("rejects a missing signature", async () => {
    const state = beginSocket(1_000);
    assert.equal(await consumeSocketAuth(state, "{}", memoryReplay(), 1_000, "p1"), "rejected");
    assert.equal(await consumeSocketAuth(state, "", memoryReplay(), 1_050, "p1"), "rejected");
  });

  it("rejects a signature for a different pact", async () => {
    const keys = await createSigningKey();
    const state = beginSocket(1_000);
    const raw = JSON.stringify({ pk: keys.pk, sig: await signBytes(keys.sk, socketCanon(state.nonce, "other", keys.pk)) });
    assert.equal(await consumeSocketAuth(state, raw, memoryReplay(), 1_000, "p1"), "rejected");
    assert.equal(state.authed, false);
  });

  it("accepts a signature over the nonce and rejects a replay", async () => {
    const keys = await createSigningKey();
    const state = beginSocket(1_000);
    const replay = memoryReplay();
    const raw = JSON.stringify({ pk: keys.pk, sig: await signBytes(keys.sk, socketCanon(state.nonce, "p1", keys.pk)) });
    assert.equal(await consumeSocketAuth(state, raw, replay, 1_000, "p1"), "ok");
    const again = beginSocket(1_000);
    again.nonce = state.nonce;
    assert.equal(await consumeSocketAuth(again, raw, replay, 1_100, "p1"), "replay");
  });

  it("times out a silent socket at 5 seconds", async () => {
    const state = beginSocket(1_000);
    assert.equal(socketTimedOut(state, 1_000 + AUTH_MS - 1), false);
    assert.equal(socketTimedOut(state, 1_000 + AUTH_MS), true);
    assert.equal(await consumeSocketAuth(state, "", memoryReplay(), 1_000 + AUTH_MS, "p1"), "timeout");
    assert.equal(state.authed, false);
  });

  it("rejects a bad origin and ignores a signature carried on the URL", () => {
    assert.equal(originAllowed("https://pact-aj.pages.dev"), "https://pact-aj.pages.dev");
    assert.equal(originAllowed("https://ajeenckya5.github.io"), "https://ajeenckya5.github.io");
    assert.equal(originAllowed("http://127.0.0.1:3010"), "http://127.0.0.1:3010");
    assert.equal(originAllowed("https://evil.example"), "");
    const url = new URL("wss://pact-api.ajeenckyam8.workers.dev/pacts/p1?x-pact-sig=abc");
    assert.equal(url.searchParams.get("x-pact-sig"), "abc");
    assert.equal(new URL("wss://pact-api.ajeenckyam8.workers.dev/pacts/p1").search, "");
  });
});
