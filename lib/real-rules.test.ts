import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { extractCredits, isAttributedRepost, textCreditsSource } from "./attribution";
import { compareNarrativesByCopycat, splitBoard } from "./board";
import { analyzeCorpus, isCopyRole } from "./detect";
import { gcScoreFrom } from "./grade";
import { FIXTURE_CLOCK, THRESHOLDS } from "./thresholds";
import type { AnnotatedPost, Corpus, FixtureAccount, FixturePost } from "./types";
import { isSyndicatingOutlet } from "./wires";

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
    const edited = TEXT.replace("several", "multiple").replace("legal experts", "court watchers");
    const softened = analyzeCorpus(
      corpus(
        [
          post({ id: "a", account: "wire", postedAt: "2026-10-05T00:00:00.000Z" }),
          post({
            id: "b",
            account: "relay",
            postedAt: "2026-10-06T00:00:00.000Z",
            text: `${edited} via @wire`,
          }),
        ],
        [account("wire")],
      ),
    );
    const templateCredit = softened.posts.find((item) => item.id === "b");
    assert.equal(templateCredit?.role, "attributed");
    assert.equal(softened.accounts.find((item) => item.handle === "relay")?.cloneScore, 0);

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

  it("syndicates a paraphrase and an exact reprint between syndicating outlets", () => {
    assert.equal(isSyndicatingOutlet("Reuters"), true);
    assert.equal(isSyndicatingOutlet("business"), true);
    assert.equal(isSyndicatingOutlet("copier"), false);
    const paraphrased = TEXT.replace("several", "multiple");
    const near = analyzeCorpus(
      corpus(
        [
          post({ id: "r", account: "Reuters", postedAt: "2026-10-18T08:00:00.000Z" }),
          post({ id: "b", account: "business", postedAt: "2026-10-18T08:05:00.000Z", text: paraphrased }),
        ],
        [account("Reuters"), account("business")],
      ),
    );
    assert.equal(near.posts.find((item) => item.account === "business")?.role, "syndicated");
    assert.equal(near.accounts.find((item) => item.handle === "business")?.cloneScore, 0);
    assert.equal(near.accounts.find((item) => item.handle === "business")?.label, "Clean");

    const report = analyzeCorpus(
      corpus(
        [
          post({ id: "r", account: "Reuters", postedAt: "2026-10-18T08:00:00.000Z" }),
          post({ id: "c", account: "CNBC", postedAt: "2026-10-18T08:10:00.000Z" }),
          post({ id: "x", account: "copier", postedAt: "2026-10-18T09:00:00.000Z" }),
        ],
        [account("Reuters"), account("CNBC"), account("copier")],
      ),
    );
    assert.equal(report.clusters.length, 1);
    const cluster = report.clusters[0];
    assert.equal(cluster.originAccount, "Reuters");
    assert.equal(cluster.posts.find((item) => item.account === "CNBC")?.role, "syndicated");
    assert.equal(cluster.posts.find((item) => item.account === "copier")?.role, "exact");
    assert.equal(report.accounts.find((item) => item.handle === "Reuters")?.cloneScore, 0);
    assert.equal(report.accounts.find((item) => item.handle === "CNBC")?.cloneScore, 0);
    assert.notEqual(report.accounts.find((item) => item.handle === "CNBC")?.label, "Clone");
    assert.equal(report.accounts.find((item) => item.handle === "copier")?.label, "Clone");
  });

  it("still clones a single syndicating outlet that copies a non-outlet with no second syndicating outlet", () => {
    const report = analyzeCorpus(
      corpus([
        post({ id: "p", account: "person", postedAt: "2026-10-18T07:00:00.000Z" }),
        post({ id: "r", account: "Reuters", postedAt: "2026-10-18T08:00:00.000Z" }),
      ]),
    );
    assert.equal(report.clusters[0]?.originAccount, "person");
    assert.equal(report.posts.find((item) => item.account === "Reuters")?.role, "exact");
  });

  it("scores an account by its highest single-post copy weight", () => {
    const report = analyzeCorpus(
      corpus([
        post({ id: "o", account: "desk", postedAt: "2026-10-18T08:00:00.000Z" }),
        post({ id: "a", account: "relay", postedAt: "2026-10-18T09:00:00.000Z" }),
        post({ id: "b", account: "relay", postedAt: "2026-10-18T10:00:00.000Z" }),
      ]),
    );
    const relay = report.accounts.find((item) => item.handle === "relay");
    assert.equal(report.posts.find((item) => item.id === "a")?.role, "exact");
    assert.equal(report.posts.find((item) => item.id === "b")?.role, "exact");
    assert.equal(relay?.cloneScore, THRESHOLDS.cloneExactWeight);
    assert.equal(relay?.gcScore, 100 - THRESHOLDS.cloneExactWeight);
  });
});

describe("false-positive classes", () => {
  it("treats per, via, Source, and 출처 plus the copied outlet as syndication", () => {
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
      assert.equal(report.accounts.find((item) => item.handle === "relay")?.cloneScore, 0, text);
      assert.notEqual(report.accounts.find((item) => item.handle === "relay")?.label, "Clone", text);
      assert.equal(report.clusters[0]?.sourceOutside, false);
    }
  });

  it("does not let one outside name clear the cluster or the uncredited copy", () => {
    const report = analyzeCorpus(
      corpus(
        [
          post({ id: "cnbc", account: "CNBC", postedAt: "2026-10-06T08:00:00.000Z", text: TEXT }),
          post({ id: "copy", account: "copier", postedAt: "2026-10-06T09:00:00.000Z", text: TEXT }),
          post({
            id: "later",
            account: "relay",
            postedAt: "2026-10-06T10:00:00.000Z",
            text: `${TEXT}, per Goldman Sachs`,
          }),
        ],
        [account("CNBC"), account("relay"), account("copier")],
      ),
    );
    const cluster = report.clusters[0];
    assert.equal(cluster?.sourceOutside, false);
    assert.equal(cluster?.originAccount, "CNBC");
    assert.equal(report.posts.find((item) => item.id === "cnbc")?.role, "originator");
    assert.equal(report.posts.find((item) => item.id === "copy")?.role, "exact");
    assert.equal(report.posts.find((item) => item.id === "later")?.role, "near");
    assert.equal(report.accounts.find((item) => item.handle === "CNBC")?.label, "Originator");
    assert.equal(report.accounts.find((item) => item.handle === "copier")?.cloneScore, THRESHOLDS.cloneExactWeight);
    assert.equal(report.accounts.find((item) => item.handle === "relay")?.cloneScore, THRESHOLDS.cloneNearWeight);
    assert.equal(report.accounts.find((item) => item.handle === "copier")?.label, "Clone");
    assert.equal(report.accounts.find((item) => item.handle === "relay")?.label, "Clone");
  });

  it("does not treat a desk copy plus an absent outlet credit as syndication", () => {
    const report = analyzeCorpus(
      corpus(
        [
          post({ id: "o", account: "desk", postedAt: "2026-10-06T08:00:00.000Z" }),
          post({ id: "credit", account: "relay", postedAt: "2026-10-06T09:00:00.000Z", text: `${TEXT}, per Bloomberg` }),
          post({ id: "alias", account: "wire", postedAt: "2026-10-06T09:30:00.000Z", text: `${TEXT} 출처: CNBC Top News` }),
          post({ id: "copy", account: "copier", postedAt: "2026-10-06T10:00:00.000Z" }),
          post({ id: "bare", account: "tipster", postedAt: "2026-10-06T11:00:00.000Z", text: `${TEXT} h/t` }),
          post({ id: "other", account: "named", postedAt: "2026-10-06T12:00:00.000Z", text: `${TEXT} via @stranger` }),
        ],
        [account("desk"), account("stranger")],
      ),
    );
    assert.equal(report.clusters[0]?.sourceOutside, false);
    assert.equal(report.clusters[0]?.originAccount, "desk");
    assert.equal(report.posts.find((item) => item.id === "o")?.role, "originator");
    // Bloomberg and CNBC did not post in this cluster, and both lines copy desk.
    assert.equal(report.posts.find((item) => item.id === "credit")?.role, "near");
    assert.equal(report.posts.find((item) => item.id === "alias")?.role, "near");
    assert.equal(report.posts.find((item) => item.id === "copy")?.role, "exact");
    assert.equal(report.posts.find((item) => item.id === "bare")?.role, "near");
    assert.equal(report.posts.find((item) => item.id === "other")?.role, "near");
    assert.equal(textCreditsSource(`${TEXT} h/t`), false);
    assert.equal(report.accounts.find((item) => item.handle === "relay")?.cloneScore, THRESHOLDS.cloneNearWeight);
    assert.equal(report.accounts.find((item) => item.handle === "wire")?.cloneScore, THRESHOLDS.cloneNearWeight);
    assert.equal(report.accounts.find((item) => item.handle === "copier")?.cloneScore, THRESHOLDS.cloneExactWeight);
    assert.equal(report.accounts.find((item) => item.handle === "tipster")?.cloneScore, THRESHOLDS.cloneNearWeight);
    assert.equal(report.accounts.find((item) => item.handle === "named")?.cloneScore, THRESHOLDS.cloneNearWeight);
    assert.equal(report.accounts.find((item) => item.handle === "desk")?.label, "Originator");
  });

  it("parses outlet credits the same way on either side of sentence punctuation", () => {
    assert.deepEqual(
      extractCredits("per Reuters. When asked, he declined").map((credit) => credit.name),
      ["Reuters"],
    );
    for (const text of [
      "per Reuters, sources said",
      "per Reuters; sources said",
      "per Reuters: sources said",
      "Already moving.\n출처: Reuters tomorrow",
      "mid sentence 출처: Reuters and then more",
    ]) {
      assert.deepEqual(
        extractCredits(text).map((credit) => credit.name),
        ["Reuters"],
        text,
      );
    }
    assert.deepEqual(
      extractCredits(
        "출처: CNBC Top News\nBlackRock's Larry Fink warns a data center moratorium could trigger a recession",
      ).map((credit) => credit.name),
      ["CNBC Top News"],
    );
    assert.deepEqual(
      extractCredits("Goldman: Diesel prices set to stay high - CNBC https://t.co/Lp0TkawEMt").map((credit) => credit.name),
      ["CNBC"],
    );
    assert.deepEqual(
      extractCredits("CNBC- BlackRock's Larry Fink warns a data center moratorium could trigger a recession").map(
        (credit) => credit.name,
      ),
      ["CNBC"],
    );

    const variants = [
      `${TEXT}, per Reuters.`,
      `${TEXT}, per Reuters,`,
      `${TEXT}, per Reuters;`,
      `${TEXT}, per Reuters:`,
      `${TEXT}\n출처: Reuters`,
    ];
    const roles = variants.map((text) => {
      const report = analyzeCorpus(
        corpus(
          [
            post({ id: "o", account: "desk", postedAt: "2026-10-06T08:00:00.000Z" }),
            post({ id: "c", account: "relay", postedAt: "2026-10-06T09:00:00.000Z", text }),
          ],
          [account("desk"), account("Reuters")],
        ),
      );
      return report.posts.find((item) => item.id === "c")?.role;
    });
    assert.deepEqual(roles, ["near", "near", "near", "near", "near"]);
  });

  it("still scores a one-word edit that adds per Bloomberg", () => {
    const edited = TEXT.replace("several", "multiple");
    const report = analyzeCorpus(
      corpus(
        [
          post({ id: "o", account: "desk", postedAt: "2026-10-06T08:00:00.000Z" }),
          post({
            id: "c",
            account: "relay",
            postedAt: "2026-10-06T09:00:00.000Z",
            text: `${edited}, per Bloomberg`,
          }),
        ],
        [account("desk")],
      ),
    );
    const copy = report.posts.find((item) => item.id === "c");
    // The credit tokens pull this under the near line. It is still a template copy.
    assert.equal(copy?.role, "template");
    assert.equal(isCopyRole(copy?.role ?? "solo"), true);
    assert.equal(report.accounts.find((item) => item.handle === "relay")?.cloneScore, THRESHOLDS.cloneTemplateWeight);
  });

  it("gives per, dash, and via the same verdict", () => {
    const forms = [`${TEXT}, per Reuters`, `${TEXT} - Reuters`, `${TEXT} via Reuters`];
    const absent = forms.map((text) => {
      const report = analyzeCorpus(
        corpus(
          [
            post({ id: "o", account: "desk", postedAt: "2026-10-06T08:00:00.000Z" }),
            post({ id: "c", account: "relay", postedAt: "2026-10-06T09:00:00.000Z", text }),
          ],
          [account("desk")],
        ),
      );
      return report.posts.find((item) => item.id === "c")?.role;
    });
    assert.deepEqual(absent, ["near", "near", "near"]);
    const present = forms.map((text) => {
      const report = analyzeCorpus(
        corpus(
          [
            post({ id: "o", account: "Reuters", postedAt: "2026-10-06T08:00:00.000Z" }),
            post({ id: "c", account: "relay", postedAt: "2026-10-06T09:00:00.000Z", text }),
          ],
          [account("Reuters"), account("relay")],
        ),
      );
      return report.posts.find((item) => item.id === "c")?.role;
    });
    assert.deepEqual(present, ["syndicated", "syndicated", "syndicated"]);
    const edited = TEXT.replace("several", "multiple").replace("legal experts", "court watchers");
    const templateForms = [`${edited}, per Reuters`, `${edited} - Reuters`, `${edited} via Reuters`];
    const softened = templateForms.map((text) => {
      const report = analyzeCorpus(
        corpus(
          [
            post({ id: "o", account: "Reuters", postedAt: "2026-10-06T08:00:00.000Z" }),
            post({ id: "c", account: "relay", postedAt: "2026-10-06T09:00:00.000Z", text }),
          ],
          [account("Reuters"), account("relay")],
        ),
      );
      return report.posts.find((item) => item.id === "c")?.role;
    });
    assert.deepEqual(softened, ["syndicated", "syndicated", "syndicated"]);
  });

  it("reads a bracket outlet tag as credit", () => {
    assert.deepEqual(
      extractCredits("[CNBC] 17:47 Goldman: Diesel prices set to stay high").map((credit) => credit.name),
      ["CNBC"],
    );
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

  it("copies a truncated row by its stored prefix and skips other fuzzy matches", () => {
    const full =
      "lenders repossessed thousands of homes in august and the filings jumped from a year earlier while new foreclosure starts barely grew";
    const later =
      "lenders repossessed thousands of homes in august and the filings jumped from a year earlier while new foreclosure starts barely grew today";
    const stored =
      "Banks are taking back more homes. Lenders repossessed 5794 homes in August, up 42 percent from a year ago and 22 percent from July, per the county filing desk. That is far faster than the 13 percent rise in overall foreclosure filings, meaning more distressed homeowners are reaching the end of the process https://t.co/foreclosure";
    const report = analyzeCorpus(
      corpus([
        post({ id: "full", account: "desk", postedAt: "2026-10-10T12:00:00.000Z", text: full }),
        post({ id: "cut-later", account: "other", postedAt: "2026-10-10T13:00:00.000Z", text: later, textTruncated: true }),
        post({ id: "cut-source", account: "wire", postedAt: "2026-10-10T11:00:00.000Z", text: stored, textTruncated: true }),
        post({ id: "contains", account: "copy", postedAt: "2026-10-10T15:00:00.000Z", text: `${stored.replace(" https://t.co/foreclosure", "")} and the county clerk confirmed the count.` }),
        post({ id: "near-prefix", account: "edit", postedAt: "2026-10-10T16:00:00.000Z", text: stored.replace("5794", "5800").replace(" https://t.co/foreclosure", " today") }),
        post({ id: "same", account: "fourth", postedAt: "2026-10-10T14:00:00.000Z", text: full, textTruncated: true }),
        post({ id: "template", account: "skel", postedAt: "2026-10-10T17:00:00.000Z", text: "A different desk note about rainfall, wheat shipments, and a quiet bond close with no shared foreclosure wording at all." }),
      ]),
    );
    assert.equal(report.posts.find((item) => item.id === "cut-later")?.role, "solo");
    assert.equal(report.posts.find((item) => item.id === "cut-source")?.role, "originator");
    assert.equal(report.posts.find((item) => item.id === "full")?.role, "originator");
    const exact = report.posts.find((item) => item.id === "same");
    assert.equal(exact?.role, "exact");
    assert.equal(exact?.matchedPostId, "full");
    const contained = report.posts.find((item) => item.id === "contains");
    assert.equal(contained?.role, "exact");
    assert.equal(contained?.matchedPostId, "cut-source");
    const near = report.posts.find((item) => item.id === "near-prefix");
    assert.equal(near?.role, "near");
    assert.equal(near?.matchedPostId, "cut-source");
    assert.equal(report.posts.find((item) => item.id === "template")?.role, "solo");

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

  it("ends the score window on the latest post date", () => {
    const report = analyzeCorpus(
      corpus([
        post({ id: "old", account: "desk", postedAt: "2026-10-03T12:00:00.000Z" }),
        post({
          id: "late",
          account: "desk",
          postedAt: "2026-10-21T14:50:58.000Z",
          text: "A short original note about rainfall.",
        }),
      ]),
    );
    assert.equal(report.clock.start, "2026-10-04");
    assert.equal(report.clock.end, "2026-10-21");
    assert.equal(report.clock.asOf, "2026-10-21T14:50:58.000Z");
    assert.equal(report.posts.some((item) => item.id === "old"), false);
    assert.equal(report.posts.some((item) => item.id === "late"), true);
  });

  it("keeps a pinned fixture clock when a later post is in the file", () => {
    const report = analyzeCorpus(
      corpus([
        post({ id: "late", account: "desk", postedAt: "2026-10-21T14:50:58.000Z" }),
        post({
          id: "in",
          account: "desk",
          postedAt: "2026-10-10T12:00:00.000Z",
          text: "A short original note about rainfall.",
        }),
      ]),
      FIXTURE_CLOCK,
    );
    assert.equal(report.clock.end, FIXTURE_CLOCK.end);
    assert.equal(report.clock.asOf, FIXTURE_CLOCK.asOf);
    assert.equal(report.posts.some((item) => item.id === "late"), false);
    assert.equal(report.posts.some((item) => item.id === "in"), true);
  });
});

describe("headline GC score", () => {
  it("is 100 minus the copy score", () => {
    assert.equal(gcScoreFrom(0, 0), 100);
    assert.equal(gcScoreFrom(100, 0), 0);
    assert.equal(gcScoreFrom(10, 35), 90);
    assert.equal(gcScoreFrom(60, 20), 40);
    assert.equal(gcScoreFrom(10, 90), 90);
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

  it("keeps a fully credited reposter out of most original", () => {
    const accounts = [
      {
        handle: "credited",
        gcScore: 100,
        postCount: 8,
        clonePostCount: 0,
        attributedPostCount: 8,
        syndicatedPostCount: 0,
      },
      {
        handle: "writer",
        gcScore: 90,
        postCount: 8,
        clonePostCount: 0,
        attributedPostCount: 0,
        syndicatedPostCount: 0,
      },
    ] as never;
    const lanes = splitBoard(accounts, 5, 8);
    assert.deepEqual(
      lanes.best.map((item) => item.handle),
      ["writer"],
    );
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

  it("ages the live corpus against its latest post", () => {
    const latest = corpusJson.posts.reduce((max, post) => (post.postedAt > max ? post.postedAt : max), "");
    assert.equal(report.clock.end, latest.slice(0, 10));
    assert.equal(report.clock.asOf, latest);
    assert.equal(report.clock.start, "2026-10-04");
    assert.ok(report.posts.every((post) => post.postedAt.slice(0, 10) <= report.clock.end));
    assert.ok(report.posts.every((post) => post.postedAt.slice(0, 10) >= report.clock.start));
  });

  it("counts new-account reposters from the reposter sample", () => {
    const immigration = report.narratives.find((item) => item.id === "immigration");
    const market = report.narratives.find((item) => item.id === "market-news");
    assert.ok(immigration?.reposters);
    assert.equal(immigration.reposters.reposters, 50);
    assert.equal(immigration.reposters.under1y, 1);
    assert.equal(immigration.reposters.under30d, 0);
    assert.equal(market?.reposters, null);
    const ranked = [...report.narratives].sort(compareNarrativesByCopycat);
    assert.equal(ranked[0]?.id, "immigration");
    assert.equal(ranked[1]?.id, "europe-protests");
    assert.equal(ranked.at(-1)?.id, "affordability");
  });

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
    // The 21 Oct Iran post is the fifth in-window post, so the sample is no longer thin.
    assert.equal(reuters.graded, true);
    assert.equal(reuters.postCount, 5);

    assert.equal(whales.graded, true);
    // Confirmed complete text, so this stays the originator. The old truncated/solo expectation was the cut-off guess.
    const capex = report.posts.find((item) => item.id === "2111548049214603437");
    assert.equal(capex?.textTruncated, undefined);
    assert.equal(capex?.role, "originator");
    assert.equal(report.posts.find((item) => item.id === "2111532949590196711")?.role, "originator");
    assert.equal(report.posts.find((item) => item.id === "2111865138747752678")?.role, "originator");
    assert.equal(report.posts.find((item) => item.id === "2111842489447669798")?.role, "originator");
    // Near of CNBC 2107393195059335458. "per Goldman Sachs" is not a recognized outlet, so this copy stays.
    const diesel = report.posts.find((item) => item.id === "2111910437012787363");
    assert.equal(diesel?.role, "near");
    assert.equal(diesel?.matchedAccount, "CNBC");
    assert.equal(diesel?.matchedPostId, "2107393195059335458");
    // That near copy is weight 55 and crosses the clone line, so the account is Clone.
    // The old notEqual(Clone) described the truncation false negative, before this match counted.
    assert.equal(whales.label, "Clone");
    // Diesel near of CNBC is 55. The Fink template inside kreia's cluster is 45.
    // The copy score is the highest single-post weight, so GC is 100 minus 55.
    assert.equal(whales.cloneScore, THRESHOLDS.cloneNearWeight);
    assert.equal(whales.gcScore, 100 - THRESHOLDS.cloneNearWeight);

    assert.equal(cheddar.label, "Originator");
    assert.equal(cheddar.cloneScore, 0);
    assert.equal(cheddar.ampScore, 0);
    assert.equal(cheddar.gcScore, 100);

    const joshuaCopy = report.posts.find((item) => item.id === "2111544732405121126");
    assert.equal(joshuaCopy?.role, "attributed");
    assert.equal(joshuaCopy?.matchedPostId, "2111532949590196711");
    assert.equal(joshuaCopy?.matchedAccount, "unusual_whales");
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
    const rattner = report.posts.find((item) => item.id === "2110230998008893535");
    assert.equal(rattner?.account, "RobertCFried");
    assert.equal(rattner?.role, "attributed");
    assert.equal(rattner?.matchedAccount, "SteveRattner");
    const robert = expectScore("RobertCFried");
    assert.equal(robert.label, "Clean");
    assert.equal(robert.cloneScore, 0);
    assert.equal(robert.gcScore, 100);
  });

  it("scores uncredited diesel and Fink copies even when one post names an outlet", () => {
    const copy = (id: string, handle: string) => {
      const found = report.posts.find((item) => item.id === id);
      const account = report.accounts.find((item) => item.handle === handle);
      assert.equal(found?.account, handle, id);
      assert.equal(isCopyRole(found?.role ?? "solo"), true, `${id} ${found?.role}`);
      assert.ok((account?.cloneScore ?? 0) > 0, handle);
    };
    copy("2107409217632215084", "DavidNStocks1");
    copy("2107414972074729955", "ArcherDion");
    const diesel = report.clusters.find((cluster) => cluster.posts.some((item) => item.id === "2107393195059335458"));
    assert.equal(diesel?.originAccount, "CNBC");
    assert.equal(report.accounts.find((item) => item.handle === "CNBC")?.label, "Originator");
    assert.equal(report.accounts.find((item) => item.handle === "CNBC")?.cloneScore, 0);
    assert.equal(report.posts.find((item) => item.id === "2111788827421319175")?.role, "syndicated");
    assert.equal(report.posts.find((item) => item.id === "2111788827421319175")?.matchedAccount, "Reuters");
    assert.equal(diesel?.sourceOutside, false);
    for (const handle of ["dbs62", "TheSlowDollar"]) {
      const account = report.accounts.find((item) => item.handle === handle);
      const match: AnnotatedPost | undefined = diesel?.posts.find((item) => item.account === handle);
      assert.ok(match, handle);
      assert.equal(isCopyRole(match.role), true, `${handle} ${match.role}`);
      assert.ok((account?.cloneScore ?? 0) > 0, handle);
    }
    // "- CNBC" names the account that was copied, so the near copy is syndicated.
    const naagesh = report.posts.find((item) => item.id === "2107523373387710945");
    assert.equal(naagesh?.account, "Naagesh_tweets");
    assert.equal(naagesh?.role, "syndicated");
    assert.equal(naagesh?.matchedAccount, "CNBC");
    assert.equal(report.accounts.find((item) => item.handle === "Naagesh_tweets")?.label, "Clean");
    assert.equal(report.accounts.find((item) => item.handle === "Naagesh_tweets")?.cloneScore, 0);
    assert.equal(report.accounts.find((item) => item.handle === "Naagesh_tweets")?.gcScore, 100);
    const press = report.posts.find((item) => item.id === "2107478547849716017");
    assert.equal(press?.account, "ManhattanPress");
    assert.equal(press?.role, "solo");
    assert.equal(report.accounts.find((item) => item.handle === "ManhattanPress")?.cloneScore, 0);

    copy("2110813360828649550", "RomansProp");
    copy("2110901937444897131", "AyataAnalytics");
    copy("2110702460256104749", "Knight172");
    const fink = report.clusters.find((cluster) => cluster.posts.some((item) => item.id === "2110813360828649550"));
    assert.equal(fink?.originAccount, "kreia");
    assert.equal(fink?.sourceOutside, false);
    const kreia = fink?.posts.find((item) => item.account === "kreia");
    assert.equal(kreia?.role, "originator");
    assert.equal(report.accounts.find((item) => item.handle === "kreia")?.cloneScore, 0);

    // Verbatim copies of unusual_whales, including its ", per CNBC" ending.
    // CNBC is not the account they copied, so the credit does not wash the copy.
    for (const [id, handle] of [
      ["2111858196524802123", "kohlirajkumar32"],
      ["2111894948593443171", "source_theinfin"],
    ] as const) {
      const copied = report.posts.find((item) => item.id === id);
      const account = report.accounts.find((item) => item.handle === handle);
      assert.equal(copied?.account, handle, id);
      assert.equal(copied?.matchedAccount, "unusual_whales", id);
      assert.equal(copied?.role, "exact", id);
      assert.ok((account?.cloneScore ?? 0) > 0, handle);
    }

    const whalesPost = report.posts.find((item) => item.id === "2111910437012787363");
    assert.equal(whalesPost?.role, "near");
    assert.equal(whalesPost?.matchedAccount, "CNBC");
    assert.equal(whalesPost?.matchedPostId, "2107393195059335458");
    assert.equal(report.posts.find((item) => item.id === "2111548049214603437")?.role, "originator");
    assert.equal(report.posts.find((item) => item.id === "2111532949590196711")?.role, "originator");

    for (const id of ["2111889643503259923", "2111890078922375229"]) {
      const copied = report.posts.find((item) => item.id === id);
      assert.equal(copied?.account, "twrzalinski1", id);
      assert.equal(copied?.textTruncated, undefined, id);
      assert.equal(copied?.matchedPostId, "2111865138747752678", id);
      assert.equal(copied?.matchedAccount, "unusual_whales", id);
      assert.equal(isCopyRole(copied?.role ?? "solo"), true, `${id} ${copied?.role}`);
    }
    const foreclosure = report.posts.find((item) => item.id === "2111865138747752678");
    assert.equal(foreclosure?.account, "unusual_whales");
    assert.equal(foreclosure?.role, "originator");
    assert.equal(foreclosure?.textTruncated, undefined);
    assert.equal(foreclosure?.text.includes("per ATTOM"), true);
    const leading = report.posts.find((item) => item.id === "2111883300516098419");
    assert.equal(leading?.account, "LeadingReport");
    assert.equal(leading?.matchedPostId, "2111812852852097103");
    assert.equal(leading?.matchedAccount, "unusual_whales");
    assert.equal(leading?.role, "near");
    assert.equal(report.accounts.find((item) => item.handle === "LeadingReport")?.label, "Clone");
    const pasted = analyzeCorpus({
      ...corpusJson,
      posts: [
        ...corpusJson.posts,
        {
          id: "paste-uw-reuters",
          account: "paste_lane",
          postedAt: "2026-10-18T20:00:00.000Z",
          text: `${report.posts.find((item) => item.id === "2111812852852097103")?.text} per Reuters`,
          narrativeId: null,
          action: "post",
          url: "https://x.com/paste_lane/status/1",
        },
      ],
    });
    const paste = pasted.posts.find((item) => item.id === "paste-uw-reuters");
    assert.equal(paste?.matchedPostId, "2111812852852097103");
    assert.equal(paste?.matchedAccount, "unusual_whales");
    assert.equal(paste?.role, "near");
    const rong = report.posts.find((item) => item.id === "2111851269472358737");
    assert.equal(rong?.account, "RongrongBell");
    assert.equal(rong?.textTruncated, undefined);
    assert.equal(rong?.matchedPostId, "2111842489447669798");
    assert.equal(rong?.matchedAccount, "unusual_whales");
    assert.equal(rong?.role, "template");
    assert.equal(report.accounts.find((item) => item.handle === "RongrongBell")?.label, "Clone");
    for (const id of ["2111842489447669798", "2111850039483961757", "2111895337493217774"]) {
      assert.equal(report.posts.find((item) => item.id === id)?.textTruncated, undefined, id);
    }
    assert.equal(report.posts.find((item) => item.id === "2111842489447669798")?.role, "originator");
    // The stored text matches the note, so the [CNBC] line can template-match.
    const bracket = report.posts.find((item) => item.id === "2107395357952905438");
    assert.equal(bracket?.account, "miraclemasui");
    assert.equal(bracket?.textTruncated, undefined);
    assert.ok(extractCredits(bracket?.text ?? "").some((credit) => credit.name === "CNBC"));
    assert.equal(bracket?.matchedAccount, "CNBC");
    assert.equal(bracket?.role, "syndicated");
  });

  it("gives ConflictAlarm and MofaYasir the same copy verdict as each other", () => {
    const hormuz = report.posts.find((item) => item.id === "2111845961819472349");
    const conflict = report.posts.find((item) => item.id === "2111846034267857155");
    const mofa = report.posts.find((item) => item.id === "2111910293559562276");
    assert.equal(hormuz?.account, "HormuzLetter");
    assert.ok(conflict);
    assert.ok(mofa);
    for (const item of [hormuz, conflict, mofa]) {
      assert.ok(item);
      assert.deepEqual(
        extractCredits(item.text).map((credit) => credit.name),
        ["Reuters"],
        item.id,
      );
    }
    assert.equal(conflict.role, "exact");
    assert.equal(mofa.role, "exact");
    assert.equal(conflict.matchedAccount, "HormuzLetter");
    assert.equal(isCopyRole(conflict.role), isCopyRole(mofa.role));
    assert.ok((report.accounts.find((item) => item.handle === "ConflictAlarm")?.cloneScore ?? 0) > 0);
    assert.ok((report.accounts.find((item) => item.handle === "MofaYasir")?.cloneScore ?? 0) > 0);
    assert.notEqual(report.accounts.find((item) => item.handle === "KING5Seattle")?.label, "Clone");
    assert.notEqual(report.accounts.find((item) => item.handle === "AlArabiya_Eng")?.label, "Clone");
  });

  it("does not let a handle credit to someone else clear a verbatim copy", () => {
    const probe = (id: string, sourceId: string, suffix: string) => {
      const source = report.posts.find((item) => item.id === sourceId);
      const handle = `probe_${id}`;
      const analyzed = analyzeCorpus({
        ...corpusJson,
        posts: [
          ...corpusJson.posts,
          {
            id,
            account: handle,
            postedAt: "2026-10-18T21:00:00.000Z",
            text: `${source?.text ?? ""}${suffix}`,
            narrativeId: null,
            action: "post",
            url: `https://x.com/${handle}/status/1`,
          },
        ],
      });
      return {
        post: analyzed.posts.find((item) => item.id === id),
        account: analyzed.accounts.find((item) => item.handle === handle),
      };
    };

    const reutersHandle = probe("probe-reuters-handle", "2111812852852097103", " via @Reuters");
    // @Reuters is stripped and the word "via" remains, so the copy is near, not a hash match.
    // The handle is not the copied account, so the credit does not clear it.
    assert.equal(reutersHandle.post?.matchedAccount, "unusual_whales");
    assert.equal(reutersHandle.post?.role, "near");
    assert.equal(reutersHandle.account?.label, "Clone");
    assert.equal(reutersHandle.account?.cloneScore, THRESHOLDS.cloneNearWeight);
    assert.equal(reutersHandle.account?.gcScore, 100 - THRESHOLDS.cloneNearWeight);

    const leading = probe("probe-leading-source", "2111883300516098419", " Source: @Reuters");
    assert.equal(isCopyRole(leading.post?.role ?? "solo"), true);

    const kreia = probe("probe-fink-kreia", "2111857588858147149", " via @kreia");
    assert.equal(isCopyRole(kreia.post?.role ?? "solo"), true);

    const whales = probe("probe-fink-whales", "2111857588858147149", " via @unusual_whales");
    assert.equal(whales.post?.role, "attributed");
  });

  it("clears RobertCFried and Naagesh when the credit names the copied account", () => {
    const robertPost = report.posts.find((item) => item.id === "2110230998008893535");
    const robert = report.accounts.find((item) => item.handle === "RobertCFried");
    assert.equal(robertPost?.role, "attributed");
    assert.equal(robertPost?.matchedAccount, "SteveRattner");
    assert.equal(robert?.label, "Clean");
    assert.equal(robert?.gcScore, 100);

    const naageshPost = report.posts.find((item) => item.id === "2107523373387710945");
    const naagesh = report.accounts.find((item) => item.handle === "Naagesh_tweets");
    assert.equal(naageshPost?.role, "syndicated");
    assert.equal(naageshPost?.matchedAccount, "CNBC");
    assert.equal(naagesh?.label, "Clean");
    assert.equal(naagesh?.gcScore, 100);
  });

  it("lists a tracked account with no posts as not graded", () => {
    const quinn = report.accounts.find((item) => item.handle === "quinnallen23");
    assert.ok(quinn);
    assert.equal(quinn.postCount, 0);
    assert.equal(quinn.graded, false);
  });

  it("keeps truncated notes on exact hash only", () => {
    const flagged = [
      "2110431151793848340",
      "2110923292747940044",
      "2110622475071463463",
      "2110533595467059605",
      "2111790305615769779",
    ];
    for (const id of flagged) {
      const post = report.posts.find((item) => item.id === id);
      assert.equal(post?.textTruncated, true, id);
      if (post && post.role !== "solo" && post.role !== "originator") {
        assert.equal(post.role, "exact", id);
      }
    }
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
