import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getReport } from "../lib/corpus";
import { runPaste } from "../lib/paste";
import { samplePastes } from "../lib/samples";
import { ORGANIC_REACH_RULE, organicReachWithheldDetail } from "../lib/thresholds";
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

  it("leaves out-of-range readings ungraded instead of clamping them to 100 STRONG", () => {
    assert.equal(gradeFor(100.5), "ungraded");
    assert.equal(gradeFor(150), "ungraded");
    assert.equal(formatScorePercent(100.5), "—");
    assert.equal(formatScorePercent(150), "—");
    assert.equal(showsEmptyGlass(100.5, true), true);
    assert.equal(showsEmptyGlass(150, true), true);
    assert.notEqual(formatScorePercent(150), "100%");
  });

  it("grades from the displayed percent, so 0.04 is 0% EXIT with an empty glass", () => {
    assert.equal(displayScore(0.04), 0);
    assert.equal(formatScorePercent(0.04), "0%");
    assert.equal(gradeFor(0.04), "exit");
    assert.equal(showsEmptyGlass(0.04, true), true);
    assert.equal(displayScore(0.09), 0);
    assert.equal(gradeFor(0.09), "exit");
    assert.equal(formatScorePercent(0.1), "0.1%");
    assert.equal(gradeFor(0.1), "weak");
    assert.equal(showsEmptyGlass(0.1, true), false);
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
    assert.equal(detectorSignal("clone", 30.01), "clone signal 30%");
    assert.equal(detectorSignal("amplifier", 60.05), "amplifier signal 60%");
    assert.equal(detectorSignal("clone", 39.95), "clone signal 39.9%");
    assert.notEqual(detectorSignal("clone", 39.95), "clone signal 40%");
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
  it("is a graded authenticity that displays as 0%", () => {
    assert.equal(showsEmptyGlass(0, true), true);
    assert.equal(showsEmptyGlass(0.04, true), true);
    assert.equal(showsEmptyGlass(0, false), false);
    assert.equal(showsEmptyGlass(0.04, false), false);
    assert.equal(showsEmptyGlass(authenticityFrom(100), true), true);
    assert.equal(showsEmptyGlass(authenticityFrom(0), true), false);
    assert.equal(showsEmptyGlass("skip", true), true);
    assert.equal(showsEmptyGlass("withheld", true), true);
    assert.equal(showsEmptyGlass(null, true), true);
    assert.equal(showsEmptyGlass(undefined, true), true);
    assert.equal(showsEmptyGlass(Number.NaN, true), true);
    assert.equal(showsEmptyGlass(-1, true), true);
    assert.equal(showsEmptyGlass(150, true), true);
    assert.equal(gradeFor("withheld"), "ungraded");
    assert.notEqual(gradeFor("withheld"), "exit");
    assert.equal(formatScorePercent("withheld"), "—");
  });
});

describe("amplifierScaleScore", () => {
  it("keeps a zero-boost skip ungraded after the authenticity flip", () => {
    const skipped = amplifierScaleScore(0, 0, 0);
    assert.equal(skipped, "withheld");
    assert.equal(authenticityFrom(skipped), "withheld");
    assert.equal(gradeFor(authenticityFrom(skipped)), "ungraded");
    assert.equal(detectorSignal("amplifier", skipped), "amplifier signal withheld");

    const underLabel = amplifierScaleScore(2, 0, 2);
    assert.equal(underLabel, "withheld");
    assert.equal(gradeFor(authenticityFrom(underLabel)), "ungraded");

    const gradedFull = amplifierScaleScore(2, 100, 2);
    assert.equal(authenticityFrom(gradedFull), 0);
    assert.equal(gradeFor(authenticityFrom(gradedFull)), "exit");

    assert.equal(authenticityFrom(amplifierScaleScore(3, 63, 2)), 37);
    assert.equal(gradeFor(authenticityFrom(amplifierScaleScore(3, 63, 2))), "weak");
    assert.equal(detectorSignal("clone", 90), "clone signal 90%");
  });

  it("withholds the paste bench Boost framing sample that fails 2 boosts on 2 days", () => {
    const account = runPaste(samplePastes.amp).accounts.find((item) => item.handle === "pasted_demo");
    assert.ok(account);
    assert.equal(account.boostPostCount, 1);
    assert.equal(account.boostDays, 1);
    assert.equal(account.passesAmpGate, false);
    assert.equal(account.ampScore, 69);
    const score = amplifierScaleScore(account.boostPostCount, account.ampScore, account.boostDays);
    assert.equal(score, "withheld");
    assert.equal(authenticityFrom(score), "withheld");
    assert.equal(gradeFor(authenticityFrom(score)), "ungraded");
    assert.equal(detectorSignal("amplifier", score), "amplifier signal withheld");
    assert.notEqual(gradeFor(authenticityFrom(score)), "weak");
    assert.equal(authenticityFrom(account.ampScore), 31);
  });

  it("withholds a failed gate on the account page path and still grades a passing gate", () => {
    const report = getReport();
    const withheld = report.accounts.find((account) => account.handle === "assay_paul");
    assert.ok(withheld);
    assert.equal(withheld.passesAmpGate, false);
    const withheldScore = amplifierScaleScore(withheld.boostPostCount, withheld.ampScore, withheld.boostDays);
    assert.equal(withheldScore, "withheld");
    assert.equal(gradeFor(authenticityFrom(withheldScore)), "ungraded");
    assert.equal(detectorSignal("amplifier", withheldScore), "amplifier signal withheld");

    const passing = report.accounts.find((account) => account.passesAmpGate);
    assert.ok(passing);
    const graded = amplifierScaleScore(passing.boostPostCount, passing.ampScore, passing.boostDays);
    assert.equal(graded, passing.ampScore);
    assert.notEqual(gradeFor(authenticityFrom(graded)), "ungraded");

    assert.equal(amplifierScaleScore(2, 80, 1), "withheld");
    assert.equal(gradeFor(authenticityFrom(amplifierScaleScore(2, 80, 1))), "ungraded");
    assert.equal(amplifierScaleScore(1, 80, 2), "withheld");
    assert.equal(gradeFor(authenticityFrom(amplifierScaleScore(1, 80, 2))), "ungraded");
    assert.equal(amplifierScaleScore(2, 69, 2), 69);
  });

  it("withholds 2 boosts on 2 days when the signal is under 45, and grades 45 or more", () => {
    const under = amplifierScaleScore(2, 38, 2);
    assert.equal(under, "withheld");
    assert.equal(authenticityFrom(under), "withheld");
    assert.equal(gradeFor(authenticityFrom(under)), "ungraded");
    assert.notEqual(gradeFor(authenticityFrom(under)), "provisional");
    assert.equal(detectorSignal("amplifier", under), "amplifier signal withheld");
    assert.equal(showsEmptyGlass(under, true), true);
    assert.equal(authenticityFrom(38), 62);
    assert.equal(gradeFor(authenticityFrom(38)), "provisional");

    assert.equal(amplifierScaleScore(2, 44, 2), "withheld");
    assert.equal(gradeFor(authenticityFrom(amplifierScaleScore(2, 44, 2))), "ungraded");

    const atGate = amplifierScaleScore(2, 45, 2);
    assert.equal(atGate, 45);
    assert.equal(authenticityFrom(atGate), 55);
    assert.equal(gradeFor(authenticityFrom(atGate)), "provisional");
    assert.equal(detectorSignal("amplifier", atGate), "amplifier signal 45%");
    assert.equal(formatScorePercent(authenticityFrom(atGate)), "55%");

    const above = amplifierScaleScore(2, 80, 2);
    assert.equal(above, 80);
    assert.equal(gradeFor(authenticityFrom(above)), "weak");
  });

  it("names the failed gate, including a signal under 45 when the boost counts pass", () => {
    const detail = organicReachWithheldDetail(2, 2, 38);
    assert.match(detail, /2 boosts across 2 days, amplifier signal 38%/);
    assert.match(detail, /Failed: amplifier signal 38 is under 45/);
    assert.equal(detail.endsWith(ORGANIC_REACH_RULE), true);
    assert.equal(
      ORGANIC_REACH_RULE,
      "Organic reach is graded only when the amplifier signal is 45 or higher with at least 2 boosts on 2 different days; otherwise it reads Not graded yet.",
    );
    const short = organicReachWithheldDetail(1, 1, 69);
    assert.match(short, /1 boost across 1 day, amplifier signal 69%/);
    assert.match(short, /1 boost is under 2/);
    assert.match(short, /1 day is under 2 different days/);
    assert.equal(short.includes("amplifier signal 69 is under 45"), false);
  });
});
