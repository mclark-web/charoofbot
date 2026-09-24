import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  amplifierScaleScore,
  displayScore,
  formatScorePercent,
  gradeFor,
  showsEmptyGlass,
} from "./gc-scale";

describe("gradeFor", () => {
  it("treats null, undefined, NaN, negatives, and skip tokens as ungraded", () => {
    assert.equal(gradeFor(null), "ungraded");
    assert.equal(gradeFor(undefined), "ungraded");
    assert.equal(gradeFor(Number.NaN), "ungraded");
    assert.equal(gradeFor(-1), "ungraded");
    assert.equal(gradeFor(-0.01), "ungraded");
    assert.equal(gradeFor("skip"), "ungraded");
    assert.equal(gradeFor("open"), "ungraded");
    assert.equal(gradeFor("withheld"), "ungraded");
  });

  it("grades a finite exact zero as exit and keeps the band cutoffs", () => {
    assert.equal(gradeFor(0), "exit");
    assert.equal(gradeFor(39.95), "weak");
    assert.equal(gradeFor(40), "provisional");
    assert.equal(gradeFor(69.99), "provisional");
    assert.equal(gradeFor(70), "strong");
    assert.equal(gradeFor(100), "strong");
  });

  it("grades from the truncated display value so 39.95 does not read as 40", () => {
    assert.equal(displayScore(39.95), 39.9);
    assert.equal(formatScorePercent(39.95), "39.9%");
    assert.equal(gradeFor(39.95), "weak");
    assert.equal(displayScore(69.99), 69.9);
    assert.equal(formatScorePercent(69.99), "69.9%");
    assert.equal(gradeFor(69.99), "provisional");
    assert.equal(formatScorePercent(0), "0%");
    assert.equal(formatScorePercent(Number.NaN), "—");
    assert.equal(formatScorePercent("skip"), "—");
    assert.equal(formatScorePercent(null).includes("NaN"), false);
  });
});

describe("showsEmptyGlass", () => {
  it("is only a graded exact zero", () => {
    assert.equal(showsEmptyGlass(0, true), true);
    assert.equal(showsEmptyGlass(0, false), false);
    assert.equal(showsEmptyGlass("skip", true), false);
    assert.equal(showsEmptyGlass(null, true), false);
    assert.equal(showsEmptyGlass(undefined, true), false);
    assert.equal(showsEmptyGlass(Number.NaN, true), false);
    assert.equal(showsEmptyGlass(-1, true), false);
    assert.equal(showsEmptyGlass(39.95, true), false);
  });
});

describe("amplifierScaleScore", () => {
  it("turns a zero-boost amplifier into a skip and leaves real scores graded", () => {
    assert.equal(amplifierScaleScore(0, 0), "skip");
    assert.equal(gradeFor(amplifierScaleScore(0, 0)), "ungraded");
    assert.equal(amplifierScaleScore(2, 0), 0);
    assert.equal(gradeFor(amplifierScaleScore(2, 0)), "exit");
    assert.equal(amplifierScaleScore(3, 63), 63);
    assert.equal(gradeFor(amplifierScaleScore(3, 63)), "provisional");
  });
});
