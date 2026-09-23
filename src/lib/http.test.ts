import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { FetchError, fetchJson } from "./http";

const original = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = original;
});

describe("fetchJson", () => {
  it("rejects an HTML body instead of throwing a raw syntax error", async () => {
    globalThis.fetch = (async () =>
      new Response("Unauthorized", { status: 200, headers: { "content-type": "text/html" } })) as typeof fetch;
    await assert.rejects(() => fetchJson("https://example.test/coach", { retries: 0 }), (err: unknown) => {
      assert.ok(err instanceof FetchError);
      assert.equal(err.kind, "parse");
      return true;
    });
  });

  it("retries a 503 once", async () => {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      if (calls === 1) return new Response("no", { status: 503, headers: { "content-type": "text/plain" } });
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } });
    }) as typeof fetch;
    const data = await fetchJson<{ ok: boolean }>("https://example.test/foods");
    assert.equal(data.ok, true);
    assert.equal(calls, 2);
  });
});
