import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { previewSrc } from "./safe-image";

describe("preview src", () => {
  it("accepts only blob and image data urls", () => {
    assert.equal(previewSrc("blob:http://localhost/abc"), "blob:http://localhost/abc");
    assert.equal(previewSrc("data:image/png;base64,aaaa"), "data:image/png;base64,aaaa");
    assert.equal(previewSrc("javascript:alert(1)"), undefined);
    assert.equal(previewSrc("https://evil.example/x.png"), undefined);
    assert.equal(previewSrc("data:text/html,hi"), undefined);
  });
});
