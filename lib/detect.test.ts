import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { analyzeCorpus } from "./detect";
import { sha256 } from "./hash";
import { normalizeText } from "./normalize";
import { runPaste } from "./paste";
import { samplePastes } from "./samples";
import type { Corpus } from "./types.ts";

const corpus = JSON.parse(
  readFileSync(new URL("../data/corpus.json", import.meta.url), "utf8"),
) as Corpus;

const report = analyzeCorpus(corpus);

function post(id: string) {
  const found = report.posts.find((item) => item.id === id);
  assert.ok(found, `missing post ${id}`);
  return found;
}

describe("fingerprint", () => {
  it("matches known SHA-256 vectors", () => {
    assert.equal(
      sha256(""),
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
    assert.equal(
      sha256("abc"),
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("strips urls, handles, cashtags, and emoji before hashing", () => {
    const origin = normalizeText(post("ai-origin").text);
    const dressed = normalizeText(post("ai-exact-1").text);
    assert.equal(origin, dressed);
    assert.equal(post("ai-origin").hash, post("ai-exact-1").hash);
  });
});

describe("fixture roles", () => {
  it("keeps the corpus inside the demo bounds", () => {
    assert.equal(corpus.narratives.length, 12);
    assert.ok(corpus.posts.length >= 40 && corpus.posts.length <= 80);
    assert.ok(report.clusters.length >= 8);
  });

  it("classifies deliberate clones and leaves amplifiers uncloned", () => {
    const misses: string[] = [];
    for (const item of report.posts) {
      if (item.id.includes("-exact") && item.role !== "exact") {
        misses.push(`${item.id} expected exact got ${item.role} j=${item.jaccard.toFixed(2)} g=${item.sharedFourGrams} via ${item.matchedPostId}`);
      }
      if (item.id.includes("-near") && item.role !== "near") {
        misses.push(`${item.id} expected near got ${item.role} j=${item.jaccard.toFixed(2)} g=${item.sharedFourGrams} via ${item.matchedPostId}`);
      }
      if (item.id.includes("-template") && item.role !== "template") {
        misses.push(`${item.id} expected template got ${item.role} j=${item.jaccard.toFixed(2)} g=${item.sharedFourGrams} via ${item.matchedPostId}`);
      }
      if (item.id.includes("-amp-") && (item.role !== "solo" || !item.isBoost)) {
        misses.push(`${item.id} expected boost solo got ${item.role} boost=${item.isBoost} j=${item.jaccard.toFixed(2)} via ${item.matchedPostId}`);
      }
      if (item.id.endsWith("-origin") && item.role !== "originator") {
        misses.push(`${item.id} expected originator got ${item.role}`);
      }
      if (item.id.startsWith("clean-") && (item.role !== "solo" || item.isBoost || item.clusterId)) {
        misses.push(`${item.id} expected clean solo got ${item.role} boost=${item.isBoost}`);
      }
    }
    assert.deepEqual(misses, []);
  });

  it("does not mix narratives inside one clone cluster", () => {
    for (const cluster of report.clusters) {
      const ids = new Set(cluster.posts.map((item) => item.narrativeId));
      assert.equal(ids.size, 1, cluster.id);
    }
  });

  it("keeps clone speech and amplifier grades separate", () => {
    const copy = report.accounts.find((account) => account.handle === "copy_lane");
    const horn = report.accounts.find((account) => account.handle === "bullhorn_7");
    const both = report.accounts.find((account) => account.handle === "both_signal");
    const mina = report.accounts.find((account) => account.handle === "ledger_mina");
    const skeptic = report.accounts.find((account) => account.handle === "skeptic_jo");
    assert.ok(copy && horn && both && mina && skeptic);
    assert.equal(copy.label, "Clone");
    assert.ok(copy.cloneScore > copy.ampScore);
    assert.equal(copy.ampScore, 0);
    assert.equal(horn.label, "Amplifier");
    assert.equal(horn.cloneScore, 0);
    assert.ok(horn.ampScore >= 45);
    assert.ok(horn.followers < copy.followers);
    assert.equal(both.label, "Clone+Amp");
    assert.equal(mina.label, "Originator");
    assert.equal(mina.cloneScore, 0);
    assert.equal(skeptic.label, "Clean");
    assert.ok(report.narratives[0].postCount >= report.narratives.at(-1)!.postCount);
  });

  it("flags new-account volume without folding age into either grade", () => {
    const copy = report.accounts.find((account) => account.handle === "copy_lane");
    const horn = report.accounts.find((account) => account.handle === "bullhorn_7");
    const mina = report.accounts.find((account) => account.handle === "ledger_mina");
    const cart = report.accounts.find((account) => account.handle === "quote_cart");
    const frame = report.accounts.find((account) => account.handle === "frame_repeat");
    const tape = report.accounts.find((account) => account.handle === "tape_reader");
    assert.ok(copy && horn && mina && cart && frame && tape);

    assert.equal(copy.ageBand, "fresh");
    assert.equal(copy.ageDays, 17);
    assert.equal(copy.label, "Clone");
    assert.equal(copy.ampScore, 0);
    assert.ok(copy.cloneScore >= 40);

    assert.equal(horn.ageBand, "young");
    assert.equal(horn.ageDays, 157);
    assert.equal(horn.label, "Amplifier");
    assert.equal(horn.cloneScore, 0);

    assert.equal(mina.ageBand, "established");
    assert.ok((mina.ageDays ?? 0) > 365);

    assert.equal(cart.ageBand, "fresh");
    assert.equal(cart.label, "Amplifier");
    assert.equal(frame.ageBand, "fresh");
    assert.equal(frame.label, "Amplifier");
    assert.equal(tape.ageBand, "established");
    assert.equal(tape.label, "Amplifier");

    const ai = report.clusters.find((cluster) => cluster.narrativeId === "ai-capex");
    const gold = report.clusters.find((cluster) => cluster.narrativeId === "gold-bid");
    const options = report.narratives.find((narrative) => narrative.id === "retail-options");
    const fed = report.narratives.find((narrative) => narrative.id === "fed-trap");
    assert.ok(ai && gold && options && fed);

    assert.equal(ai.age.freshPostCount, 3);
    assert.equal(ai.age.freshVolumePct, 60);
    assert.equal(ai.age.underYearVolumePct, 80);
    assert.equal(ai.age.freshAccountsDominate, true);
    assert.equal(ai.age.newAccountsDominate, true);

    assert.equal(gold.age.underYearPostCount, 0);
    assert.equal(gold.age.newAccountsDominate, false);

    assert.equal(options.age.freshVolumePct, 75);
    assert.equal(options.age.freshAccountsDominate, true);
    assert.ok(options.freshBoostPosts >= 1);

    assert.equal(fed.age.newAccountsDominate, false);
    assert.equal(fed.age.underYearVolumePct, 29);

    assert.ok(report.totals.newAccountNarrativeCount >= 1);
    assert.ok(report.totals.freshPostCount >= 1);
    assert.ok(report.totals.freshPostCount <= report.totals.underYearPostCount);

    for (const cluster of report.clusters) {
      assert.ok(cluster.age.freshVolumePct <= cluster.age.underYearVolumePct);
      assert.equal(
        cluster.age.freshPostCount +
          cluster.age.youngPostCount +
          cluster.age.establishedPostCount +
          cluster.age.unknownAgePostCount,
        cluster.posts.length,
      );
    }
  });
});

describe("paste bench", () => {
  it("flags a duplicate of a fixture post as an exact clone", () => {
    const origin = corpus.posts.find((item) => item.id === "ai-origin");
    assert.ok(origin);
    const run = runPaste(samplePastes.exact);
    const finding = run.findings[0];
    assert.equal(finding.role, "exact");
    assert.equal(finding.matchedAccount, "ledger_mina");
    assert.equal(finding.jaccard, 1);
    const pastedAccount = run.accounts.find((account) => account.handle === "pasted_demo");
    assert.equal(pastedAccount?.label, "Clone");
    assert.ok((pastedAccount?.cloneScore ?? 0) >= 40);
  });

  it("does not treat a retweet prefix as clone speech", () => {
    const origin = corpus.posts.find((item) => item.id === "ai-origin");
    assert.ok(origin);
    const run = runPaste(`RT @ledger_mina: ${origin.text}`);
    assert.equal(run.findings[0].isRetweet, true);
    assert.equal(run.findings[0].role, "solo");
    assert.equal(run.findings[0].clusterId, null);
  });

  it("flags a one-word edit as a near duplicate rather than an exact hash", () => {
    const run = runPaste(samplePastes.near);
    assert.equal(run.findings[0].role, "near");
    assert.ok(run.findings[0].jaccard >= 0.85);
    assert.ok(run.findings[0].jaccard < 1);
  });

  it("marks slogan reuse as an amplifier hit without a clone match", () => {
    const run = runPaste(samplePastes.amp);
    const finding = run.findings[0];
    assert.equal(finding.role, "solo");
    assert.equal(finding.isBoost, true);
    assert.ok(finding.frameNarrativeIds.includes("ai-capex"));
  });

  it("leaves omitted paste age unknown and does not change either grade", () => {
    const plain = runPaste(samplePastes.exact);
    assert.equal(plain.findings[0].ageBand, "unknown");
    assert.equal(plain.findings[0].ageDays, null);
    const pasted = plain.accounts.find((account) => account.handle === "pasted_demo");
    assert.equal(pasted?.ageBand, "unknown");

    const text = samplePastes.exact.split("\n").slice(1).join("\n");
    const aged = runPaste(JSON.stringify([{ account: "pasted_demo", text, ageDays: 3 }]));
    assert.equal(aged.findings[0].ageBand, "fresh");
    assert.equal(aged.findings[0].ageDays, 3);
    const agedAccount = aged.accounts.find((account) => account.handle === "pasted_demo");
    assert.equal(agedAccount?.cloneScore, pasted?.cloneScore);
    assert.equal(agedAccount?.ampScore, pasted?.ampScore);
    assert.equal(agedAccount?.label, pasted?.label);
  });

  it("reads a created date, an age in days, and keeps fixture ages", () => {
    const joined = runPaste(
      "@week_old\njoined: 2026-09-01\nAI capex supercycle keeps showing up in my replies this week, and I still have not opened a supplier filing.",
    );
    assert.equal(joined.findings[0].ageBand, "fresh");
    assert.equal(joined.findings[0].ageDays, 21);
    assert.equal(joined.findings[0].text.includes("joined:"), false);

    const established = runPaste(
      JSON.stringify([{ account: "old_paste", text: "Library note for my own desk: reconcile the source PDF before repeating a sentence.", ageDays: 400 }]),
    );
    assert.equal(established.findings[0].ageBand, "established");

    const young = runPaste(
      JSON.stringify([{ account: "year_paste", text: "Library note for my own desk: reconcile the source PDF before repeating a sentence.", accountCreatedAt: "2026-01-15" }]),
    );
    assert.equal(young.findings[0].ageBand, "young");

    const broken = runPaste(JSON.stringify([{ account: "bad_date", text: "Library note for my own desk: reconcile the source PDF before repeating a sentence.", accountCreatedAt: "yesterday" }]));
    assert.equal(broken.findings[0].ageBand, "unknown");
    assert.ok(broken.warnings.some((warning) => warning.includes("bad_date")));

    const fixture = runPaste(JSON.stringify([{ account: "copy_lane", text: "A short aside.", ageDays: 9000 }]));
    assert.equal(fixture.findings[0].ageBand, "fresh");
    assert.equal(fixture.findings[0].ageDays, 17);
    assert.ok(fixture.warnings.some((warning) => warning.includes("copy_lane")));
  });

  it("badges a fresh amplifier without turning the paste into clone speech", () => {
    const run = runPaste(samplePastes.fresh);
    assert.equal(run.findings.length, 2);
    for (const finding of run.findings) {
      assert.equal(finding.role, "solo");
      assert.equal(finding.isBoost, true);
      assert.equal(finding.ageBand, "fresh");
    }
    const account = run.accounts.find((item) => item.handle === "fresh_horn");
    assert.equal(account?.label, "Amplifier");
    assert.equal(account?.cloneScore, 0);
    assert.equal(account?.ageBand, "fresh");
    assert.ok((account?.ampScore ?? 0) >= 45);
  });
});
