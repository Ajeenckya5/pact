import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { peopleInCircle } from "./training";

const ids = ["maya", "jordan", "sam", "riley", "chris"];

describe("demo isolation", () => {
  it("hides the sample circle until demo mode is on", () => {
    assert.deepEqual(
      peopleInCircle(ids, []).map((friend) => friend.name),
      [],
    );
    assert.deepEqual(
      peopleInCircle(ids, [], true).map((friend) => friend.name),
      ["Maya Chen", "Jordan Blake", "Sam Okonkwo", "Riley Park", "Chris Nguyen"],
    );
  });
});
