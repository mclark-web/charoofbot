import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bandForAgeDays, resolveAge, summarizeAges } from "./age";
import { AGE_AS_OF } from "./thresholds";

describe("account age bands", () => {
  it("splits fresh, under a year, established, and unknown", () => {
    assert.equal(bandForAgeDays(0), "fresh");
    assert.equal(bandForAgeDays(29), "fresh");
    assert.equal(bandForAgeDays(30), "young");
    assert.equal(bandForAgeDays(364), "young");
    assert.equal(bandForAgeDays(365), "established");
    assert.equal(bandForAgeDays(null), "unknown");
  });

  it("reads a created date or ageDays against the fixture clock", () => {
    const fromDate = resolveAge({ accountCreatedAt: "2026-09-05" }, AGE_AS_OF);
    assert.equal(fromDate.ageDays, 17);
    assert.equal(fromDate.ageBand, "fresh");

    const fromDays = resolveAge({ ageDays: 100 }, AGE_AS_OF);
    assert.equal(fromDays.ageDays, 100);
    assert.equal(fromDays.ageBand, "young");
    assert.equal(resolveAge({ ageDays: 365 }, AGE_AS_OF).ageBand, "established");

    assert.equal(resolveAge({}, AGE_AS_OF).ageBand, "unknown");
    assert.equal(resolveAge({ accountCreatedAt: "yesterday", ageDays: 4 }, AGE_AS_OF).ageBand, "fresh");
    assert.equal(resolveAge({ accountCreatedAt: "yesterday" }, AGE_AS_OF).ageBand, "unknown");
  });

  it("highlights when new accounts are at least half the posts", () => {
    const halfFresh = summarizeAges(["fresh", "established"]);
    assert.equal(halfFresh.freshVolumePct, 50);
    assert.equal(halfFresh.underYearVolumePct, 50);
    assert.equal(halfFresh.freshAccountsDominate, true);
    assert.equal(halfFresh.newAccountsDominate, true);

    const halfYoung = summarizeAges(["young", "established"]);
    assert.equal(halfYoung.freshAccountsDominate, false);
    assert.equal(halfYoung.newAccountsDominate, true);

    const minority = summarizeAges(["fresh", "established", "established"]);
    assert.equal(minority.freshVolumePct, 33);
    assert.equal(minority.newAccountsDominate, false);

    const unknownCountsInDenominator = summarizeAges(["fresh", "unknown"]);
    assert.equal(unknownCountsInDenominator.freshVolumePct, 50);
    assert.equal(unknownCountsInDenominator.unknownAgePostCount, 1);
  });
});
