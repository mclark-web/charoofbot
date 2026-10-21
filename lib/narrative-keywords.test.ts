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
import {
  inheritedNarrative,
  keywordOverride,
  narrativeHasKeywords,
  narrativeMatchesKeywords,
  type KeywordPost,
} from "./narrative-keywords";

const DAVIOS_REPLIES = [
  "2112833089257050575",
  "2112846506642289020",
  "2112863373704769854",
  "2112867489441108074",
  "2112867777849508141",
  "2112868517464649867",
  "2112870697483555179",
  "2112872401922834455",
  "2112876689210409020",
  "2112893094882689325",
  "2112908641766670739",
  "2112913230880186488",
  "2112887539296084357",
  "2112908521574396089",
  "2112908898055106631",
  "2112917319265747006",
  "2112918631327658419",
] as const;

function keywordPost(row: CsvRow): KeywordPost {
  return {
    postId: row.post_id,
    narrativeId: row.narrative_id,
    text: row.text,
    action: row.action,
    refPostId: row.ref_post_id,
    handle: row.handle,
  };
}

describe("phrase-search keyword sanity", () => {
  const posts = readGcbotTable("posts.csv");
  const keywordPosts = posts.map(keywordPost);
  const byKeywordId = new Map(keywordPosts.map((post) => [post.postId, post]));
  const overrides = readGcbotTable("post-overrides.csv");
  const corpus = buildCorpus();

  it("keeps an override for every phrase-search post the topic keywords reject", () => {
    const byId = new Map(overrides.map((row) => [row.post_id, row]));
    for (const post of keywordPosts) {
      const decision = keywordOverride(post, byKeywordId);
      const row = byId.get(post.postId);
      if (!decision) {
        assert.equal(row, undefined, post.postId);
        continue;
      }
      assert.ok(row, post.postId);
      assert.equal(row.action, decision.action, post.postId);
      assert.equal(row.new_narrative, decision.newNarrative, post.postId);
      byId.delete(post.postId);
    }
    assert.deepEqual([...byId.keys()], []);
  });

  it("counts a post only in a narrative whose keywords match the text, or whose parent it answers", () => {
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
    assert.equal(byId.get("2112811230637220130")?.narrativeId, "iran");

    for (const id of DAVIOS_REPLIES) {
      const post = byId.get(id);
      const raw = byKeywordId.get(id);
      assert.ok(post, id);
      assert.ok(raw, id);
      assert.equal(post.narrativeId, "iran", id);
      assert.equal(narrativeMatchesKeywords("iran", post.text), false, id);
      assert.equal(inheritedNarrative(raw, byKeywordId), "iran", id);
    }

    for (const post of corpus.posts) {
      if (!post.narrativeId || !narrativeHasKeywords(post.narrativeId)) continue;
      const raw = byKeywordId.get(post.id);
      const inherited = raw ? inheritedNarrative(raw, byKeywordId) === post.narrativeId : false;
      assert.equal(
        narrativeMatchesKeywords(post.narrativeId, post.text) || inherited,
        true,
        `${post.narrativeId} ${post.id}`,
      );
    }
  });

  it("keeps the earliest poster of a shared text as its originator and re-derives the affordability originator", () => {
    const report = analyzeCorpus(corpus);
    const cbsNews = report.posts.find((post) => post.account === "CBSNews");
    assert.ok(cbsNews?.clusterId);
    const cluster = report.clusters.find((item) => item.id === cbsNews.clusterId);
    assert.ok(cluster);
    const members = report.posts
      .filter((post) => post.clusterId === cbsNews.clusterId)
      .sort((a, b) => (a.postedAt < b.postedAt ? -1 : a.postedAt > b.postedAt ? 1 : a.id < b.id ? -1 : 1));
    const earliestPoster = members[0];
    assert.ok(earliestPoster);
    assert.equal(cluster.originAccount, earliestPoster.account);
    assert.equal(earliestPoster.role, "originator");
    assert.equal(earliestPoster.account, "shannonrwatts");
    // EThompsonWV links cbsnews.com, so CBS News is publishing its own article.
    assert.equal(cbsNews.role, "originator");
    assert.equal(cbsNews.matchedAccount, "EThompsonWV");
    const cbsAccount = report.accounts.find((item) => item.handle === "CBSNews");
    assert.equal(cbsAccount?.label, "Originator");
    assert.equal(cbsAccount?.clonePostCount, 0);
    const philly = report.posts.find((post) => post.account === "CBSPhiladelphia");
    const phillyAccount = report.accounts.find((item) => item.handle === "CBSPhiladelphia");
    assert.equal(philly?.role, "solo");
    assert.equal(phillyAccount?.label, "Clean");
    assert.equal(phillyAccount?.clonePostCount, 0);
    const affordability = report.narratives.find((item) => item.id === "affordability");
    assert.ok(affordability);
    const earliestAffordability = corpus.posts
      .filter(
        (post) =>
          post.narrativeId === "affordability" &&
          post.postedAt.slice(0, 10) >= report.clock.start &&
          post.postedAt.slice(0, 10) <= report.clock.end,
      )
      .sort((a, b) => (a.postedAt < b.postedAt ? -1 : a.postedAt > b.postedAt ? 1 : a.id < b.id ? -1 : 1))[0];
    assert.ok(earliestAffordability);
    assert.equal(affordability.originAccount, earliestAffordability.account);
    assert.notEqual(affordability.originAccount, "HardcoreMetal89");
    assert.equal(narrativeMatchesKeywords("affordability", earliestAffordability.text), true);
  });
});
