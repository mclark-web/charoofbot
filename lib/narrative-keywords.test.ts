import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Corpus } from "./types";

type CsvRow = Record<string, string>;

declare module "../scripts/build-corpus.mjs" {
  export function readGcbotTable(name: string): CsvRow[];
  export function buildCorpus(): Corpus;
}

import { buildCorpus, readGcbotTable } from "../scripts/build-corpus.mjs";
import { analyzeCorpus } from "./detect";
import { keywordOverride, narrativeHasKeywords, narrativeMatchesKeywords } from "./narrative-keywords";

describe("phrase-search keyword sanity", () => {
  const posts = readGcbotTable("posts.csv");
  const overrides = readGcbotTable("post-overrides.csv");
  const corpus = buildCorpus();

  it("keeps an override for every phrase-search post the topic keywords reject", () => {
    const byId = new Map(overrides.map((row) => [row.post_id, row]));
    for (const post of posts) {
      const decision = keywordOverride(post.post_id, post.narrative_id, post.text);
      const row = byId.get(post.post_id);
      if (!decision) {
        assert.equal(row, undefined, post.post_id);
        continue;
      }
      assert.ok(row, post.post_id);
      assert.equal(row.action, decision.action, post.post_id);
      assert.equal(row.new_narrative, decision.newNarrative, post.post_id);
      byId.delete(post.post_id);
    }
    assert.deepEqual([...byId.keys()], []);
  });

  it("counts a post only in a narrative whose keywords match the text", () => {
    const byId = new Map(corpus.posts.map((post) => [post.id, post]));
    const whiteHouse = byId.get("2112915510702534675");
    assert.equal(whiteHouse?.narrativeId, "immigration");
    assert.equal(narrativeMatchesKeywords("immigration", whiteHouse?.text ?? ""), true);
    assert.equal(byId.get("2112447298781512161")?.narrativeId, null);
    assert.equal(byId.get("2112916859263578496")?.narrativeId, null);
    assert.equal(byId.get("2112907268014657717")?.narrativeId, null);
    assert.equal(byId.get("2112897467184505003")?.narrativeId, null);
    assert.equal(byId.get("2112909974661984445")?.narrativeId, "europe-protests");
    assert.equal(byId.get("2112562361361912027")?.narrativeId, "immigration");

    for (const post of corpus.posts) {
      if (!post.narrativeId || !narrativeHasKeywords(post.narrativeId)) continue;
      assert.equal(
        narrativeMatchesKeywords(post.narrativeId, post.text),
        true,
        `${post.narrativeId} ${post.id}`,
      );
    }
  });

  it("labels the CBS investigation lede as Originator and re-derives the affordability originator", () => {
    const report = analyzeCorpus(corpus);
    for (const handle of ["CBSNews", "CBSPhiladelphia"]) {
      const account = report.accounts.find((item) => item.handle === handle);
      assert.ok(account, handle);
      assert.equal(account.label, "Originator", handle);
      assert.equal(account.clonePostCount, 0, handle);
    }
    const affordability = report.narratives.find((item) => item.id === "affordability");
    assert.ok(affordability);
    const earliest = corpus.posts
      .filter(
        (post) =>
          post.narrativeId === "affordability" &&
          post.postedAt.slice(0, 10) >= report.clock.start &&
          post.postedAt.slice(0, 10) <= report.clock.end,
      )
      .sort((a, b) => (a.postedAt < b.postedAt ? -1 : a.postedAt > b.postedAt ? 1 : a.id < b.id ? -1 : 1))[0];
    assert.ok(earliest);
    assert.equal(affordability.originAccount, earliest.account);
    assert.notEqual(affordability.originAccount, "HardcoreMetal89");
    assert.equal(narrativeMatchesKeywords("affordability", earliest.text), true);
  });
});
