import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { fetchJson } from "./http";

const original = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = original;
});

describe("fetchJson result", () => {
  it("returns every error kind without throwing", async () => {
    globalThis.fetch = (async () =>
      new Response("Unauthorized", { status: 200, headers: { "content-type": "text/html" } })) as typeof fetch;
    const parsed = await fetchJson("https://example.test/coach", { retries: 0 });
    assert.equal(parsed.ok, false);
    if (!parsed.ok) assert.equal(parsed.error.kind, "parse");

    globalThis.fetch = (async () => new Response("no", { status: 404, headers: { "content-type": "text/plain" } })) as typeof fetch;
    const http = await fetchJson("https://example.test/missing", { retries: 0 });
    assert.equal(http.ok, false);
    if (!http.ok) assert.equal(http.error.kind, "http");

    globalThis.fetch = (async () => {
      throw new Error("offline");
    }) as typeof fetch;
    const network = await fetchJson("https://example.test/down", { retries: 0 });
    assert.equal(network.ok, false);
    if (!network.ok) assert.equal(network.error.kind, "network");

    globalThis.fetch = (async (_url: string, init?: RequestInit) => {
      init?.signal?.addEventListener("abort", () => {});
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          const err = new Error("aborted");
          err.name = "AbortError";
          reject(err);
        });
      });
    }) as typeof fetch;
    const timeout = await fetchJson("https://example.test/slow", { retries: 0, timeoutMs: 20 });
    assert.equal(timeout.ok, false);
    if (!timeout.ok) assert.equal(timeout.error.kind, "timeout");
  });
});
