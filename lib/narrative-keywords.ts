/**
 * Topic keywords for narratives collected by phrase search. A post counted in
 * one of these narratives has to match, unless post-overrides.csv retags or
 * excludes it. Tracked-account lanes (market news, options, sports) are not
 * phrase searches and have no keyword list.
 */
const NARRATIVE_KEYWORDS: Readonly<Record<string, RegExp>> = {
  uap: /ufo|\buaps?\b|extraterrestrial|area\s*51|\bnhi\b|flying saucer|unidentified (?:aerial|anomalous)|aliens?\s+exist|(?:ufo|uap|alien).{0,80}disclosure|disclosure.{0,80}(?:ufo|uap|alien)/i,
  iran: /\biran\b|iranian|tehran|khamenei|\birgc\b/i,
  "fed-rates":
    /\bfed\b|federal reserve|\bfomc\b|\bpowell\b|rate cut|interest rate|\binflation\b|\bcpi\b|\bppi\b|producer price|basis point/i,
  affordability: /afford|cost of living|cost-of-living|grocery|\bhousing\b|\brenter\b|\brent\b/i,
  "us-elections": /election|midterm|ballot|\bvot(?:e|es|ed|ing|er|ers)\b|\bsenator\b|\bcampaign\b|\bimpeach/i,
  immigration:
    /immigr|deport|\bice\b|\bborder\b|illegal alien|asylum|migrant|undocumented|non-?citizen|homeland security|\bdhs\b|\bvisa\b|sanctuary|\baliens?\b/i,
  "europe-protests":
    /protest|\briots?\b|unrest|demonstrat|hit the streets|take to the streets|\bmacron\b|france is burning|\bburning\b/i,
};

/** Phrase-search narratives, in the order a missed post is retagged. */
export const PHRASE_NARRATIVE_IDS: readonly string[] = [
  "immigration",
  "europe-protests",
  "us-elections",
  "fed-rates",
  "affordability",
  "iran",
  "uap",
];

export function narrativeHasKeywords(narrativeId: string): boolean {
  return Object.prototype.hasOwnProperty.call(NARRATIVE_KEYWORDS, narrativeId);
}

export function narrativeMatchesKeywords(narrativeId: string, text: string): boolean {
  const pattern = NARRATIVE_KEYWORDS[narrativeId];
  if (!pattern) return true;
  return pattern.test(text);
}

/**
 * Video-game and movie uses of "alien" are not immigration and not UAP.
 * The word still matches the immigration keyword, so these posts are excluded
 * by id instead of retagged.
 */
export const OFF_TOPIC_ALIEN_POSTS: ReadonlySet<string> = new Set([
  "2112919515621138543",
  "2112919480238014949",
  "2112919514274742311",
]);

export type OverrideAction = "retag" | "exclude";

export type KeywordOverride = {
  postId: string;
  action: OverrideAction;
  newNarrative: string;
  reason: string;
};

/** A posts.csv row the keyword check can see, including the parent link. */
export type KeywordPost = {
  postId: string;
  narrativeId: string;
  text: string;
  action: string;
  refPostId: string;
  handle: string;
};

/**
 * Narrative a reply or quote keeps when its own text never repeats the topic
 * word. The parent has to stay in a phrase-search narrative. When that parent
 * is outside the file, another reply or quote by the same account can lend
 * the narrative. An excluded parent does not.
 */
function isThreadAction(action: string): boolean {
  return action === "reply" || action === "quote";
}

export function inheritedNarrative(
  post: KeywordPost,
  byId: ReadonlyMap<string, KeywordPost>,
  stack: Set<string> = new Set(),
): string {
  const fromParent = parentNarrative(post, byId, stack);
  if (fromParent) return fromParent;
  return siblingNarrative(post, byId, stack);
}

function parentNarrative(
  post: KeywordPost,
  byId: ReadonlyMap<string, KeywordPost>,
  stack: Set<string>,
): string {
  if (!isThreadAction(post.action)) return "";
  if (!post.refPostId || stack.has(post.postId)) return "";
  const parent = byId.get(post.refPostId);
  if (!parent) return "";
  const next = new Set(stack);
  next.add(post.postId);
  return narrativeKept(parent, byId, next);
}

/**
 * A reply or quote whose parent is outside the file still belongs with the
 * thread when the same account has another reply or quote kept in that
 * narrative by its own keywords or by an in-corpus parent.
 */
function siblingNarrative(
  post: KeywordPost,
  byId: ReadonlyMap<string, KeywordPost>,
  stack: Set<string>,
): string {
  if (!isThreadAction(post.action) || !post.handle || stack.has(post.postId)) return "";
  const found = new Set<string>();
  const next = new Set(stack);
  next.add(post.postId);
  for (const other of byId.values()) {
    if (other.postId === post.postId || other.handle !== post.handle || !isThreadAction(other.action)) continue;
    // Only a sibling that itself answers an in-corpus parent. A sibling kept
    // by its own keywords is a different post, not this thread.
    const kept = parentNarrative(other, byId, next);
    if (kept && narrativeHasKeywords(kept)) found.add(kept);
  }
  if (found.size !== 1) return "";
  return [...found][0] ?? "";
}

/** Narrative this post is allowed to stay in before an override is applied. */
function narrativeKept(
  post: KeywordPost,
  byId: ReadonlyMap<string, KeywordPost>,
  stack: Set<string>,
): string {
  if (stack.has(post.postId) || OFF_TOPIC_ALIEN_POSTS.has(post.postId)) return "";
  const next = new Set(stack);
  next.add(post.postId);
  const tagged = post.narrativeId;
  if (tagged && narrativeHasKeywords(tagged) && narrativeMatchesKeywords(tagged, post.text)) return tagged;
  if (tagged && !narrativeHasKeywords(tagged)) return tagged;
  const inherited = inheritedNarrative(post, byId, next);
  if (inherited && narrativeHasKeywords(inherited)) return inherited;
  const moved = keywordMove(post);
  return moved?.action === "retag" ? moved.newNarrative : "";
}

function keywordMove(post: KeywordPost): KeywordOverride | null {
  const { postId, narrativeId, text } = post;
  const europeRiot =
    /\bmacron\b|france is burning|hit the streets|take to the streets|\briots?\b/i.test(text) &&
    narrativeMatchesKeywords("europe-protests", text);
  if (europeRiot && narrativeId !== "europe-protests") {
    return {
      postId,
      action: "retag",
      newNarrative: "europe-protests",
      reason: "Europe protest or Macron riot wording, not the tagged narrative",
    };
  }
  for (const candidate of PHRASE_NARRATIVE_IDS) {
    if (candidate === narrativeId) continue;
    if (!narrativeMatchesKeywords(candidate, text)) continue;
    return {
      postId,
      action: "retag",
      newNarrative: candidate,
      reason: `Topic keywords match ${candidate}, not ${narrativeId}`,
    };
  }
  return null;
}

/**
 * Where a phrase-search post should move when its current tag misses the
 * topic keywords. Null when the current tag already matches, or when a reply
 * or quote inherits that same narrative from its parent.
 * Europe wins over immigration when the post is a Macron or Europe riot,
 * so "blaming the riots on immigration" stays a Europe protest.
 */
export function keywordOverride(
  post: KeywordPost,
  byId: ReadonlyMap<string, KeywordPost>,
): KeywordOverride | null {
  const { postId, narrativeId, text } = post;
  if (!narrativeId || !narrativeHasKeywords(narrativeId)) return null;
  if (OFF_TOPIC_ALIEN_POSTS.has(postId)) {
    return {
      postId,
      action: "exclude",
      newNarrative: "",
      reason: "Video-game or movie aliens, not a UAP or immigration post",
    };
  }
  if (narrativeMatchesKeywords(narrativeId, text)) return null;
  const fromParent = parentNarrative(post, byId, new Set());
  if (fromParent) {
    if (fromParent === narrativeId) return null;
    return {
      postId,
      action: "retag",
      newNarrative: fromParent,
      reason: `Reply or quote of a ${fromParent} post`,
    };
  }
  const moved = keywordMove(post);
  if (moved) return moved;
  if (siblingNarrative(post, byId, new Set()) === narrativeId) return null;
  return {
    postId,
    action: "exclude",
    newNarrative: "",
    reason: `No ${narrativeId} topic keywords, and no other narrative fits`,
  };
}
