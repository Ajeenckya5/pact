import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { allowedRequestUrl, fetchJson } from "./net";

const original = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = original;
});

describe("fetchJson", () => {
  it("does not fetch a host outside the allowlist", async () => {
    let called = false;
    globalThis.fetch = (async () => {
      called = true;
      return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
    }) as typeof fetch;
    const blocked = await fetchJson("https://evil.example/secret", { retries: 0 });
    assert.equal(blocked.ok, false);
    if (!blocked.ok) assert.equal(blocked.error.message, "blocked url");
    assert.equal(called, false);
    assert.equal(allowedRequestUrl("https://evil.example/secret"), null);
    assert.equal(allowedRequestUrl("https://user:pass@example.test/foods"), null);
    assert.equal(allowedRequestUrl("https://example.test/foods?q=paneer"), "https://example.test/foods?q=paneer");
    assert.equal(allowedRequestUrl("http://127.0.0.1:8788/foods"), "http://127.0.0.1:8788/foods");
  });

  it("returns a parse error for HTML instead of throwing", async () => {
    globalThis.fetch = (async () =>
      new Response("Unauthorized", { status: 200, headers: { "content-type": "text/html" } })) as typeof fetch;
    const result = await fetchJson("https://example.test/coach", { retries: 0 });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error.kind, "parse");
  });

  it("returns an http error for a 500 after one retry", async () => {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      return new Response("no", { status: 503, headers: { "content-type": "text/plain" } });
    }) as typeof fetch;
    const result = await fetchJson("https://example.test/foods", { retries: 1 });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error.kind, "http");
    assert.equal(calls, 2);
  });

  it("returns data when the retry succeeds", async () => {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      if (calls === 1) return new Response("no", { status: 503, headers: { "content-type": "text/plain" } });
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } });
    }) as typeof fetch;
    const result = await fetchJson<{ ok: boolean }>("https://example.test/foods");
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.data.ok, true);
  });
});
