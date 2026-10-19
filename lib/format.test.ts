import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { countNoun, displayPostText, joinPresent } from "./format";

describe("countNoun", () => {
  it("pluralizes a single post and leaves other counts plural", () => {
    assert.equal(countNoun(1, "post"), "1 post");
    assert.equal(countNoun(0, "post"), "0 posts");
    assert.equal(countNoun(2, "post"), "2 posts");
    assert.equal(countNoun(1, "copy", "copies"), "1 copy");
    assert.equal(countNoun(3, "copy", "copies"), "3 copies");
  });
});

describe("displayPostText", () => {
  it("adds an ellipsis only when the stored text is flagged and does not already end in one", () => {
    assert.equal(displayPostText("KOSPI", true), "KOSPI…");
    assert.equal(displayPostText("already cut…", true), "already cut…");
    assert.equal(displayPostText("already cut...", true), "already cut...");
    assert.equal(displayPostText("KOSPI", false), "KOSPI");
  });
});

describe("joinPresent", () => {
  it("hides zero-count segments", () => {
    assert.equal(
      joinPresent([false, "2 near", null, undefined, ""]),
      "2 near",
    );
  });
});
