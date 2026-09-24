import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  amplifierScaleScore,
  authenticityFrom,
  detectorSignal,
  displayScore,
  formatScorePercent,
  gradeFor,
  showsEmptyGlass,
} from "./gc-scale";

describe("gradeFor", () => {
  it("grades an authenticity reading, not a raw detector score", () => {
    assert.equal(gradeFor(null), "ungraded");
    assert.equal(gradeFor(undefined), "ungraded");
    assert.equal(gradeFor(Number.NaN), "ungraded");
    assert.equal(gradeFor(-1), "ungraded");
    assert.equal(gradeFor(-0.01), "ungraded");
    assert.equal(gradeFor("skip"), "ungraded");
    assert.equal(gradeFor("open"), "ungraded");
    assert.equal(gradeFor("withheld"), "ungraded");
    assert.equal(gradeFor(0), "exit");
    assert.equal(gradeFor(1), "weak");
    assert.equal(gradeFor(39.95), "weak");
    assert.equal(gradeFor(40), "provisional");
    assert.equal(gradeFor(69.99), "provisional");
    assert.equal(gradeFor(70), "strong");
    assert.equal(gradeFor(100), "strong");
  });

  it("truncates the printed authenticity so 39.95 does not read as 40", () => {
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

describe("authenticityFrom", () => {
  it("flips graded detector endpoints and keeps the band boundaries", () => {
    assert.equal(authenticityFrom(0), 100);
    assert.equal(gradeFor(authenticityFrom(0)), "strong");
    assert.equal(formatScorePercent(authenticityFrom(0)), "100%");
    assert.equal(showsEmptyGlass(authenticityFrom(0), true), false);

    assert.equal(authenticityFrom(100), 0);
    assert.equal(gradeFor(authenticityFrom(100)), "exit");
    assert.equal(formatScorePercent(authenticityFrom(100)), "0%");
    assert.equal(showsEmptyGlass(authenticityFrom(100), true), true);

    assert.equal(authenticityFrom(90), 10);
    assert.equal(gradeFor(authenticityFrom(90)), "weak");
    assert.equal(formatScorePercent(authenticityFrom(90)), "10%");

    assert.equal(authenticityFrom(99), 1);
    assert.equal(gradeFor(authenticityFrom(99)), "weak");

    assert.equal(authenticityFrom(30), 70);
    assert.equal(gradeFor(authenticityFrom(30)), "strong");

    assert.equal(authenticityFrom(30.01), 69.99);
    assert.equal(gradeFor(authenticityFrom(30.01)), "provisional");
    assert.equal(formatScorePercent(authenticityFrom(30.01)), "69.9%");

    assert.equal(authenticityFrom(60), 40);
    assert.equal(gradeFor(authenticityFrom(60)), "provisional");

    assert.equal(authenticityFrom(60.05), 39.95);
    assert.equal(gradeFor(authenticityFrom(60.05)), "weak");
    assert.equal(formatScorePercent(authenticityFrom(60.05)), "39.9%");
  });

  it("does not flip skips, null, NaN, or negatives into 100 STRONG", () => {
    assert.equal(authenticityFrom(null), null);
    assert.equal(authenticityFrom(undefined), undefined);
    assert.equal(authenticityFrom("skip"), "skip");
    assert.equal(authenticityFrom("open"), "open");
    assert.equal(authenticityFrom("withheld"), "withheld");
    assert.equal(authenticityFrom(-1), -1);
    assert.ok(Number.isNaN(authenticityFrom(Number.NaN)));
    for (const value of [null, undefined, "skip", "open", "withheld", -1, Number.NaN] as const) {
      assert.equal(gradeFor(authenticityFrom(value)), "ungraded");
      assert.notEqual(authenticityFrom(value), 100);
    }
  });
});

describe("showsEmptyGlass", () => {
  it("is only a graded authenticity of exact zero", () => {
    assert.equal(showsEmptyGlass(0, true), true);
    assert.equal(showsEmptyGlass(0, false), false);
    assert.equal(showsEmptyGlass(authenticityFrom(100), true), true);
    assert.equal(showsEmptyGlass(authenticityFrom(0), true), false);
    assert.equal(showsEmptyGlass("skip", true), false);
    assert.equal(showsEmptyGlass(null, true), false);
    assert.equal(showsEmptyGlass(undefined, true), false);
    assert.equal(showsEmptyGlass(Number.NaN, true), false);
    assert.equal(showsEmptyGlass(-1, true), false);
  });
});

describe("amplifierScaleScore", () => {
  it("keeps a zero-boost skip ungraded after the authenticity flip", () => {
    const skipped = amplifierScaleScore(0, 0);
    assert.equal(skipped, "skip");
    assert.equal(authenticityFrom(skipped), "skip");
    assert.equal(gradeFor(authenticityFrom(skipped)), "ungraded");
    assert.equal(detectorSignal("amplifier", skipped), "amplifier signal withheld");

    const gradedZero = amplifierScaleScore(2, 0);
    assert.equal(gradedZero, 0);
    assert.equal(authenticityFrom(gradedZero), 100);
    assert.equal(gradeFor(authenticityFrom(gradedZero)), "strong");

    const gradedFull = amplifierScaleScore(2, 100);
    assert.equal(authenticityFrom(gradedFull), 0);
    assert.equal(gradeFor(authenticityFrom(gradedFull)), "exit");

    assert.equal(authenticityFrom(amplifierScaleScore(3, 63)), 37);
    assert.equal(gradeFor(authenticityFrom(amplifierScaleScore(3, 63))), "weak");
    assert.equal(detectorSignal("clone", 90), "clone signal 90%");
  });
});
