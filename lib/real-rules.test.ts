import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { isAttributedRepost, textCreditsSource } from "./attribution";
import { splitBoard } from "./board";
import { analyzeCorpus, isCopyRole } from "./detect";
import { gcScoreFrom } from "./grade";
import { THRESHOLDS } from "./thresholds";
import type { Corpus, FixtureAccount, FixturePost } from "./types";
import { isWireOutlet } from "./wires";

const TEXT =
  "President Trump has declined to rule out declaring a national emergency related to the midterms and legal experts expect litigation delays across several states.";

function post(partial: Partial<FixturePost> & Pick<FixturePost, "id" | "account" | "postedAt">): FixturePost {
  return {
    text: TEXT,
    narrativeId: null,
    action: "post",
    ...partial,
  };
}

function corpus(posts: FixturePost[], accounts: FixtureAccount[] = []): Corpus {
  return { narratives: [], accounts, posts };
}

function account(handle: string): FixtureAccount {
  return {
    handle,
    name: handle,
    bio: "",
    joined: "2010-01-01",
    accountCreatedAt: "2010-01-01",
    followers: 10,
    following: 1,
    follows: [],
  };
}

describe("real-data copy rules", () => {
  it("does not count an account matching its own earlier posts", () => {
    const report = analyzeCorpus(
      corpus([
        post({ id: "a1", account: "desk", postedAt: "2026-10-05T12:00:00.000Z" }),
        post({ id: "a2", account: "desk", postedAt: "2026-10-06T12:00:00.000Z" }),
        post({ id: "a3", account: "desk", postedAt: "2026-10-07T12:00:00.000Z" }),
      ]),
    );
    assert.equal(report.clusters.length, 0);
    for (const item of report.posts) {
      assert.equal(item.role, "solo");
      assert.equal(item.matchedAccount, null);
    }
    const desk = report.accounts.find((item) => item.handle === "desk");
    assert.equal(desk?.cloneScore, 0);
    assert.equal(desk?.label, "Clean");
  });

  it("keeps the earliest poster as originator and does not score their later posts as copies", () => {
    const report = analyzeCorpus(
      corpus([
        post({ id: "r1", account: "Reuters", postedAt: "2026-10-16T10:00:00.000Z" }),
        post({ id: "c1", account: "copier", postedAt: "2026-10-16T11:00:00.000Z" }),
        post({ id: "r2", account: "Reuters", postedAt: "2026-10-17T10:00:00.000Z" }),
      ]),
    );
    assert.equal(report.clusters.length, 1);
    const cluster = report.clusters[0];
    assert.equal(cluster.originAccount, "Reuters");
    for (const item of cluster.posts) {
      if (item.account === "Reuters") assert.equal(item.role, "originator");
    }
    const copy = cluster.posts.find((item) => item.id === "c1");
    assert.equal(copy?.role, "exact");
    const reuters = report.accounts.find((item) => item.handle === "Reuters");
    const copier = report.accounts.find((item) => item.handle === "copier");
    assert.equal(reuters?.cloneScore, 0);
    assert.equal(reuters?.label, "Originator");
    assert.equal(copier?.cloneScore, THRESHOLDS.cloneExactWeight);
    assert.equal(copier?.label, "Clone");
  });

  it("removes clone weight for explicit credit and does not treat a quote as credit", () => {
    const credited = [
      `${TEXT} — via @wire`,
      `${TEXT}\nSource:\n@wire`,
      `${TEXT} h/t @wire`,
    ];
    for (const text of credited) {
      const report = analyzeCorpus(
        corpus(
          [
            post({ id: "a", account: "wire", postedAt: "2026-10-05T00:00:00.000Z" }),
            post({ id: "b", account: "relay", postedAt: "2026-10-06T00:00:00.000Z", text }),
          ],
          [account("wire")],
        ),
      );
      const relay = report.posts.find((item) => item.id === "b");
      const scored = report.accounts.find((item) => item.handle === "relay");
      assert.equal(relay?.role, "attributed", text);
      assert.equal(scored?.cloneScore, 0);
      assert.notEqual(scored?.label, "Clone");
    }

    const quoted = analyzeCorpus(
      corpus([
        post({ id: "a", account: "wire", postedAt: "2026-10-05T00:00:00.000Z" }),
        post({ id: "b", account: "relay", postedAt: "2026-10-06T00:00:00.000Z", action: "quote" }),
      ]),
    );
    assert.equal(quoted.posts.find((item) => item.id === "b")?.role, "exact");
    assert.equal(textCreditsSource("Prices moved via the open market per share today."), false);
    assert.equal(isAttributedRepost("A note with no credit.", "quote"), false);
  });

  it("treats syndicated wire text as one cluster and does not clone the outlets", () => {
    assert.equal(isWireOutlet("Reuters"), true);
    assert.equal(isWireOutlet("business"), true);
    assert.equal(isWireOutlet("copier"), false);
    const report = analyzeCorpus(
      corpus(
        [
          post({ id: "r", account: "Reuters", postedAt: "2026-10-18T08:00:00.000Z" }),
          post({ id: "b", account: "business", postedAt: "2026-10-18T08:05:00.000Z" }),
          post({ id: "c", account: "CNBC", postedAt: "2026-10-18T08:10:00.000Z" }),
          post({ id: "x", account: "copier", postedAt: "2026-10-18T09:00:00.000Z" }),
        ],
        [account("Reuters"), account("business"), account("CNBC"), account("copier")],
      ),
    );
    assert.equal(report.clusters.length, 1);
    const cluster = report.clusters[0];
    assert.equal(cluster.originAccount, "Reuters");
    assert.equal(cluster.syndicatedCount, 2);
    assert.equal(cluster.cloneCount, 1);
    assert.equal(cluster.posts.find((item) => item.account === "business")?.role, "syndicated");
    assert.equal(cluster.posts.find((item) => item.account === "CNBC")?.role, "syndicated");
    assert.equal(cluster.posts.find((item) => item.account === "copier")?.role, "exact");
    assert.equal(report.accounts.find((item) => item.handle === "Reuters")?.cloneScore, 0);
    assert.equal(report.accounts.find((item) => item.handle === "business")?.cloneScore, 0);
    assert.equal(report.accounts.find((item) => item.handle === "business")?.label, "Clean");
    assert.equal(report.accounts.find((item) => item.handle === "copier")?.label, "Clone");
  });

  it("still clones a single outlet that copies a non-outlet with no other wire in the cluster", () => {
    const report = analyzeCorpus(
      corpus([
        post({ id: "p", account: "person", postedAt: "2026-10-18T07:00:00.000Z" }),
        post({ id: "r", account: "Reuters", postedAt: "2026-10-18T08:00:00.000Z" }),
      ]),
    );
    assert.equal(report.clusters[0]?.originAccount, "person");
    assert.equal(report.posts.find((item) => item.account === "Reuters")?.role, "exact");
  });
});

describe("false-positive classes", () => {
  it("treats per, via, Source, and 출처 plus an outlet name as syndication", () => {
    const texts = [
      `${TEXT}, per Reuters`,
      `${TEXT} via Reuters`,
      `${TEXT}\nSource: Reuters`,
      `${TEXT} 출처: Reuters`,
    ];
    for (const text of texts) {
      const report = analyzeCorpus(
        corpus(
          [
            post({ id: "a", account: "Reuters", postedAt: "2026-10-16T10:00:00.000Z" }),
            post({ id: "b", account: "relay", postedAt: "2026-10-16T12:00:00.000Z", text }),
          ],
          [account("Reuters"), account("relay")],
        ),
      );
      const relay = report.posts.find((item) => item.id === "b");
      assert.equal(relay?.role, "syndicated", text);
      assert.equal(report.accounts.find((item) => item.handle === "relay")?.cloneScore, 0);
      assert.notEqual(report.accounts.find((item) => item.handle === "relay")?.label, "Clone");
      assert.equal(report.clusters[0]?.sourceOutside, false);
    }
  });

  it("marks a named source that is not in the corpus instead of crowning the first poster", () => {
    const report = analyzeCorpus(
      corpus(
        [
          post({ id: "cnbc", account: "CNBC", postedAt: "2026-10-06T08:00:00.000Z", text: TEXT }),
          post({
            id: "later",
            account: "relay",
            postedAt: "2026-10-18T20:00:00.000Z",
            text: `${TEXT}, per Goldman Sachs`,
          }),
        ],
        [account("CNBC"), account("relay")],
      ),
    );
    const cluster = report.clusters[0];
    assert.equal(cluster?.sourceOutside, true);
    assert.equal(cluster?.originAccount, null);
    assert.equal(cluster?.cloneCount, 0);
    for (const item of cluster?.posts ?? []) assert.equal(item.role, "outside");
    assert.notEqual(report.accounts.find((item) => item.handle === "CNBC")?.label, "Originator");
    assert.notEqual(report.accounts.find((item) => item.handle === "relay")?.label, "Clone");
  });

  it("does not count a quote with commentary as a boost and requires a timeline baseline", () => {
    const commentary = analyzeCorpus(
      corpus(
        [
          post({
            id: "q1",
            account: "thedave2006",
            postedAt: "2026-10-05T12:00:00.000Z",
            action: "quote",
            narrativeId: "ai-capex",
            source: "quotes",
            text: "The total return on the tech index just hit a new high. Interesting charting action here.",
          }),
          post({
            id: "q2",
            account: "thedave2006",
            postedAt: "2026-10-06T12:00:00.000Z",
            action: "quote",
            narrativeId: "ai-capex",
            source: "quotes",
            text: "Monday follow through selling inbound it seems from this chart.",
          }),
        ],
        [{ ...account("thedave2006"), trackedBoard: null }],
      ),
    );
    const dave = commentary.accounts.find((item) => item.handle === "thedave2006");
    assert.equal(dave?.boostPostCount, 0);
    assert.equal(dave?.timelinePostCount, 0);
    assert.notEqual(dave?.label, "Amplifier");

    const shortTimeline = analyzeCorpus({
      narratives: [
        {
          id: "ai-capex",
          title: "AI capex",
          shortLabel: "AI",
          topic: "Equities",
          summary: "",
          framePhrases: ["ai capex supercycle"],
        },
      ],
      accounts: [],
      posts: [
        post({ id: "t1", account: "horn", postedAt: "2026-10-05T12:00:00.000Z", text: "AI capex supercycle keeps circulating and I am only repeating it today." }),
        post({ id: "t2", account: "horn", postedAt: "2026-10-06T12:00:00.000Z", text: "AI capex supercycle again, same frame, no new evidence from me." }),
      ],
    });
    assert.equal(shortTimeline.accounts.find((item) => item.handle === "horn")?.passesAmpGate, false);
  });

  it("never scores a tracked lane account as a booster", () => {
    const report = analyzeCorpus({
      narratives: [
        {
          id: "ai-capex",
          title: "AI capex",
          shortLabel: "AI",
          topic: "Equities",
          summary: "",
          framePhrases: ["ai capex supercycle"],
        },
      ],
      accounts: [{ ...account("CheddarFlow"), trackedBoard: "fintwit" }],
      posts: [
        post({ id: "a", account: "CheddarFlow", postedAt: "2026-10-15T12:00:00.000Z", narrativeId: "ai-capex", text: "AI capex supercycle is the only line I pass along today." }),
        post({ id: "b", account: "CheddarFlow", postedAt: "2026-10-16T12:00:00.000Z", narrativeId: "ai-capex", text: "AI capex supercycle remains the frame and I am not the source of a new fact." }),
        post({ id: "c", account: "CheddarFlow", postedAt: "2026-10-17T12:00:00.000Z", narrativeId: "ai-capex", text: "AI capex supercycle one more time so the lane stays visible." }),
      ],
    });
    const cheddar = report.accounts.find((item) => item.handle === "CheddarFlow");
    assert.equal(cheddar?.boostPostCount, 0);
    assert.notEqual(cheddar?.label, "Amplifier");
  });

  it("does not label Clone from one template match unless it is half the posts or there are two", () => {
    const skeleton = "someone just loaded four million of soxx january calls as an opening spread while soxx trades around five hundred";
    const one = analyzeCorpus(
      corpus([
        post({ id: "o", account: "desk", postedAt: "2026-10-16T12:00:00.000Z", text: `${skeleton} and open interest was only eighty contracts on the book` }),
        post({ id: "c", account: "solo", postedAt: "2026-10-16T13:00:00.000Z", text: `${skeleton} with a slightly different ending about the tape` }),
        post({ id: "own", account: "solo", postedAt: "2026-10-16T14:00:00.000Z", text: "A separate note about shipping schedules and warehouse inventory that shares no market claim." }),
        post({ id: "own2", account: "solo", postedAt: "2026-10-17T14:00:00.000Z", text: "Another original paragraph about rainfall totals and reservoir levels across the valley this week." }),
      ]),
    );
    const solo = one.accounts.find((item) => item.handle === "solo");
    const matched = one.posts.find((item) => item.id === "c");
    assert.equal(matched?.role, "template");
    assert.notEqual(solo?.label, "Clone");

    const share = analyzeCorpus(
      corpus([
        post({ id: "o", account: "desk", postedAt: "2026-10-16T12:00:00.000Z", text: `${skeleton} and open interest was only eighty contracts on the book` }),
        post({ id: "c", account: "bot", postedAt: "2026-10-16T13:00:00.000Z", text: `${skeleton} with a slightly different ending about the tape` }),
      ]),
    );
    assert.equal(share.accounts.find((item) => item.handle === "bot")?.label, "Clone");
  });

  it("keeps truncated text out of near-duplicate and template matches", () => {
    const full =
      "lenders repossessed thousands of homes in august and the filings jumped from a year earlier while new foreclosure starts barely grew";
    const earlier =
      "lenders repossessed thousands of houses in august and the filings jumped from a year earlier while new foreclosure starts barely grew";
    const later =
      "lenders repossessed thousands of homes in august and the filings jumped from a year earlier while new foreclosure starts barely grew today";
    const report = analyzeCorpus(
      corpus([
        post({ id: "full", account: "desk", postedAt: "2026-10-10T12:00:00.000Z", text: full }),
        post({ id: "cut-later", account: "other", postedAt: "2026-10-10T13:00:00.000Z", text: later, textTruncated: true }),
        post({ id: "cut-earlier", account: "third", postedAt: "2026-10-10T11:00:00.000Z", text: earlier, textTruncated: true }),
        post({ id: "same", account: "fourth", postedAt: "2026-10-10T14:00:00.000Z", text: full, textTruncated: true }),
      ]),
    );
    assert.equal(report.posts.find((item) => item.id === "cut-later")?.role, "solo");
    assert.equal(report.posts.find((item) => item.id === "cut-earlier")?.role, "solo");
    assert.equal(report.posts.find((item) => item.id === "full")?.role, "originator");
    const exact = report.posts.find((item) => item.id === "same");
    assert.equal(exact?.role, "exact");
    assert.equal(exact?.matchedPostId, "full");

    const unflagged = analyzeCorpus(
      corpus([
        post({ id: "full", account: "desk", postedAt: "2026-10-10T12:00:00.000Z", text: full }),
        post({ id: "cut-later", account: "other", postedAt: "2026-10-10T13:00:00.000Z", text: later }),
      ]),
    );
    assert.equal(unflagged.posts.find((item) => item.id === "cut-later")?.role, "near");
  });

  it("scores every account on 4–18 Oct and withholds a thin sample", () => {
    const report = analyzeCorpus(
      corpus([
        post({ id: "early", account: "desk", postedAt: "2026-10-01T12:00:00.000Z" }),
        post({ id: "in", account: "desk", postedAt: "2026-10-10T12:00:00.000Z", text: "A short original note about rainfall." }),
      ]),
    );
    assert.equal(report.posts.some((item) => item.id === "early"), false);
    const desk = report.accounts.find((item) => item.handle === "desk");
    assert.equal(desk?.postCount, 1);
    assert.equal(desk?.graded, false);
  });
});

describe("headline GC score", () => {
  it("is 100 minus the worse detector signal", () => {
    assert.equal(gcScoreFrom(0, 0), 100);
    assert.equal(gcScoreFrom(100, 0), 0);
    assert.equal(gcScoreFrom(10, 35), 65);
    assert.equal(gcScoreFrom(60, 20), 40);
  });
});

describe("best and worst lanes", () => {
  it("requires the minimum sample and does not put one account in both lanes", () => {
    const accounts = [1, 2, 3, 4, 5, 6].map((index) => ({
      handle: `h${index}`,
      gcScore: index * 10,
      postCount: index < 3 ? 2 : THRESHOLDS.leaderboardMinPosts,
    })) as never;
    const lanes = splitBoard(accounts, THRESHOLDS.leaderboardMinPosts, 8);
    assert.deepEqual(
      lanes.best.map((item) => item.handle),
      ["h6", "h5"],
    );
    assert.deepEqual(
      lanes.worst.map((item) => item.handle),
      ["h3", "h4"],
    );
    const overlap = lanes.best.filter((item) => lanes.worst.some((other) => other.handle === item.handle));
    assert.deepEqual(overlap, []);
  });

  it("does not list a STRONG score as a copycat when lower scores exist", () => {
    const accounts = [
      { handle: "a", gcScore: 100, postCount: 10 },
      { handle: "b", gcScore: 100, postCount: 10 },
      { handle: "e", gcScore: 70, postCount: 9 },
      { handle: "d", gcScore: 64, postCount: 8 },
      { handle: "c", gcScore: 40, postCount: 10 },
      { handle: "tiny", gcScore: 0, postCount: 2 },
    ] as never;
    const lanes = splitBoard(accounts, 5, 8);
    assert.deepEqual(
      lanes.best.map((item) => item.handle),
      ["a", "b", "e"],
    );
    assert.deepEqual(
      lanes.worst.map((item) => item.handle),
      ["c", "d"],
    );
  });
});

describe("real corpus after the rules", () => {
  const corpusJson = JSON.parse(
    readFileSync(new URL("../data/corpus.json", import.meta.url), "utf8"),
  ) as Corpus;
  const report = analyzeCorpus(corpusJson);

  it("never scores a post as a copy of the same account", () => {
    const selfCopies = report.posts.filter(
      (item) => item.matchedAccount === item.account && isCopyRole(item.role),
    );
    assert.deepEqual(
      selfCopies.map((item) => item.id),
      [],
    );
  });

  it("keeps every cluster originator unscored as a copy", () => {
    for (const cluster of report.clusters) {
      for (const item of cluster.posts) {
        if (item.account === cluster.originAccount) {
          assert.equal(item.role, "originator", `${cluster.id} ${item.id}`);
        }
      }
    }
  });

  it("drops the wire and self-repeat false positives on the named accounts", () => {
    const expectScore = (handle: string) => {
      const found = report.accounts.find((item) => item.handle === handle);
      assert.ok(found, handle);
      return found;
    };
    const reuters = expectScore("Reuters");
    const whales = expectScore("unusual_whales");
    const cheddar = expectScore("CheddarFlow");
    const joshua = expectScore("Joshuatrader1");
    const joe = expectScore("JTFOz");

    assert.equal(reuters.label, "Originator");
    assert.equal(reuters.cloneScore, 0);
    assert.equal(reuters.gcScore, 100);
    assert.equal(reuters.graded, false);

    assert.equal(whales.label, "Originator");
    assert.equal(whales.cloneScore, 0);
    assert.equal(whales.gcScore, 100);
    assert.equal(whales.graded, true);

    assert.equal(cheddar.label, "Originator");
    assert.equal(cheddar.cloneScore, 0);
    assert.equal(cheddar.ampScore, 0);
    assert.equal(cheddar.gcScore, 100);

    assert.equal(joshua.label, "Clean");
    assert.equal(joshua.cloneScore, 0);
    assert.equal(joshua.gcScore, 100);
    assert.equal(report.posts.find((item) => item.id === "2107220780006408594")?.role, "attributed");

    assert.equal(joe.label, "Clean");
    assert.equal(joe.cloneScore, 0);
    assert.equal(joe.gcScore, 100);

    for (const handle of ["thedave2006", "crushthemarket", "MichaelPBento"]) {
      const account = expectScore(handle);
      assert.notEqual(account.label, "Amplifier");
      assert.equal(account.passesAmpGate, false);
    }
    assert.equal(report.posts.find((item) => item.id === "2110230998008893535")?.role, "attributed");
  });

  it("keeps the reply-bot paraphrases, the uncredited CheddarFlow copy, and the new-account reposts", () => {
    const flagged = [
      ["2111124537639350393", "MichaelMook9", "template"],
      ["2111135110120841432", "BullToss69", "template"],
      ["2110839336115790312", "JustinUnruh16", "template"],
      ["2111131463492280414", "SooJersey_Al", "exact"],
      ["2111847146517643600", "wirezero19", "exact"],
      ["2111813782221828451", "WFIC_Media", "exact"],
    ] as const;
    for (const [id, handle, role] of flagged) {
      const post = report.posts.find((item) => item.id === id);
      const account = report.accounts.find((item) => item.handle === handle);
      assert.equal(post?.role, role, id);
      assert.equal(account?.label, "Clone", handle);
    }
  });
});
