import { ageOfPoster, resolveAge, summarizeAges, type ResolvedAge } from "./age";
import { extractCredits, type SourceCredit } from "./attribution";
import { gcScoreFrom } from "./grade";
import { sha256 } from "./hash";
import {
  fourGrams,
  jaccard,
  normalizeText,
  peelRetweet,
  sharedCount,
  tokensOf,
} from "./normalize";
import { compareText } from "./order";
import { passesAmplifierGate, SCORE_WINDOW, THRESHOLDS } from "./thresholds";
import { isRecognizedNewsOutlet, isSyndicatingOutlet, outletAccounts } from "./wires";
import type {
  AccountLabel,
  AccountReport,
  AnnotatedPost,
  CloneCluster,
  Corpus,
  FixtureAccount,
  FixturePost,
  FollowLink,
  MatchKind,
  NarrativeEdge,
  NarrativeVolume,
  PostRole,
  Report,
} from "./types";

type Features = {
  post: FixturePost;
  normalized: string;
  hash: string;
  tokens: string[];
  tokenSet: Set<string>;
  grams: Set<string>;
  isRetweet: boolean;
  frameNarrativeIds: string[];
  framePhrases: string[];
  credits: SourceCredit[];
};

const WINDOW_MS = THRESHOLDS.clusterWindowHours * 60 * 60 * 1000;

function frameHits(
  normalized: string,
  narratives: Corpus["narratives"],
): { ids: string[]; phrases: string[] } {
  const ids: string[] = [];
  const phrases: string[] = [];
  for (const narrative of narratives) {
    for (const phrase of narrative.framePhrases) {
      const normalizedPhrase = normalizeText(phrase);
      if (normalizedPhrase.length > 0 && normalized.includes(normalizedPhrase)) {
        ids.push(narrative.id);
        phrases.push(normalizedPhrase);
        break;
      }
    }
  }
  return { ids, phrases };
}

function inScoreWindow(iso: string): boolean {
  const day = iso.slice(0, 10);
  return day >= SCORE_WINDOW.start && day <= SCORE_WINDOW.end;
}

/** Phrase-search and quote-search hits are not a timeline. Omitted source counts as one. */
export function countsAsTimeline(source: string | null | undefined): boolean {
  return source !== "phrase-search" && source !== "quotes";
}

function featurize(post: FixturePost, narratives: Corpus["narratives"]): Features {
  const peeled = peelRetweet(post.text);
  const normalized = normalizeText(peeled.body);
  const tokens = tokensOf(normalized);
  const frames = frameHits(normalized, narratives);
  return {
    post,
    normalized,
    hash: sha256(normalized),
    tokens,
    tokenSet: new Set(tokens),
    grams: fourGrams(tokens),
    isRetweet: peeled.isRetweet || post.action === "repost",
    frameNarrativeIds: frames.ids,
    framePhrases: frames.phrases,
    credits: extractCredits(post.text),
  };
}

function cloneWeight(kind: MatchKind): number {
  if (kind === "exact") return THRESHOLDS.cloneExactWeight;
  if (kind === "near") return THRESHOLDS.cloneNearWeight;
  return THRESHOLDS.cloneTemplateWeight;
}

export function isCopyRole(role: PostRole): boolean {
  return role === "exact" || role === "near" || role === "template";
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function blankAccount(handle: string): FixtureAccount {
  return {
    handle,
    name: handle,
    bio: "",
    joined: "",
    followers: 0,
    following: 0,
    follows: [],
  };
}

export function analyzeCorpus(corpus: Corpus): Report {
  const ordered = corpus.posts
    .filter((post) => inScoreWindow(post.postedAt))
    .sort((a, b) => compareText(a.postedAt, b.postedAt) || compareText(a.id, b.id));
  const features = ordered.map((post) => featurize(post, corpus.narratives));

  const clusterOf = new Map<string, string>();
  const roleOf = new Map<string, PostRole>();
  const matchedId = new Map<string, string | null>();
  const matchedJ = new Map<string, number>();
  const matchedG = new Map<string, number>();
  const featureById = new Map(features.map((feature) => [feature.post.id, feature]));

  for (let index = 0; index < features.length; index++) {
    const current = features[index];
    clusterOf.set(current.post.id, current.post.id);
    roleOf.set(current.post.id, "solo");
    matchedId.set(current.post.id, null);
    matchedJ.set(current.post.id, 0);
    matchedG.set(current.post.id, 0);

    if (current.isRetweet || current.post.action === "repost" || current.tokens.length < THRESHOLDS.minTokens) continue;

    const currentMs = Date.parse(current.post.postedAt);
    let best: {
      id: string;
      clusterId: string;
      kind: MatchKind;
      jaccard: number;
      shared: number;
      at: string;
    } | null = null;

    for (let prevIndex = 0; prevIndex < index; prevIndex++) {
      const prev = features[prevIndex];
      if (prev.isRetweet || prev.post.action === "repost" || prev.tokens.length < THRESHOLDS.minTokens) continue;
      // An account repeating its own earlier post is not a copy of someone else.
      if (prev.post.account === current.post.account) continue;
      const delta = currentMs - Date.parse(prev.post.postedAt);
      if (delta < 0 || delta > WINDOW_MS) continue;

      const classified = pairMatch(current, prev);
      if (!classified) continue;
      const { kind, score, shared } = classified;

      const better =
        !best ||
        rank(kind) > rank(best.kind) ||
        (kind === best.kind && score > best.jaccard) ||
        (kind === best.kind && score === best.jaccard && prev.post.postedAt < best.at);
      if (better) {
        best = {
          id: prev.post.id,
          clusterId: clusterOf.get(prev.post.id) ?? prev.post.id,
          kind,
          jaccard: score,
          shared,
          at: prev.post.postedAt,
        };
      }
    }

    // A later restatement can outscore the earliest original. When this post
    // credits that original outlet, and the original itself still matches,
    // attach there so the credit is judged against the outlet, not the restatement.
    if (best) {
      const originId = clusterOf.get(best.id) ?? best.id;
      const origin = originId === best.id ? undefined : featureById.get(originId);
      if (
        origin &&
        origin.post.account !== current.post.account &&
        creditsOutletAccount(current.credits, origin.post.account)
      ) {
        const originDelta = currentMs - Date.parse(origin.post.postedAt);
        if (originDelta >= 0 && originDelta <= WINDOW_MS) {
          const originMatch = pairMatch(current, origin);
          if (originMatch) {
            best = {
              id: origin.post.id,
              clusterId: originId,
              kind: originMatch.kind,
              jaccard: originMatch.score,
              shared: originMatch.shared,
              at: origin.post.postedAt,
            };
          }
        }
      }
    }

    if (best) {
      clusterOf.set(current.post.id, best.clusterId);
      roleOf.set(current.post.id, best.kind);
      matchedId.set(current.post.id, best.id);
      matchedJ.set(current.post.id, best.jaccard);
      matchedG.set(current.post.id, best.shared);
    }
  }

  const members = new Map<string, Features[]>();
  for (const feature of features) {
    const clusterId = clusterOf.get(feature.post.id) ?? feature.post.id;
    const list = members.get(clusterId);
    if (list) list.push(feature);
    else members.set(clusterId, [feature]);
  }

  const handleByKey = new Map<string, string>();
  for (const account of corpus.accounts) {
    handleByKey.set(account.handle.toLowerCase(), account.handle);
    handleByKey.set(account.name.trim().toLowerCase(), account.handle);
    handleByKey.set(account.handle.replaceAll("_", " ").toLowerCase(), account.handle);
  }
  for (const [clusterId, group] of members) {
    if (group.length < 2) {
      for (const feature of group) {
        clusterOf.set(feature.post.id, feature.post.id);
        roleOf.set(feature.post.id, "solo");
        matchedId.set(feature.post.id, null);
        matchedJ.set(feature.post.id, 0);
        matchedG.set(feature.post.id, 0);
      }
      members.delete(clusterId);
      continue;
    }

    // The earliest in-corpus poster stays the originator. One later credit does not
    // move the origin or clear the other copiers.
    const originHandle = group[0].post.account;
    const clusterHandles = new Set(group.map((feature) => feature.post.account));
    const syndicatingAccounts = new Set(
      [...clusterHandles].filter((handle) => isSyndicatingOutlet(handle)),
    );
    const syndicatingCluster = syndicatingAccounts.size >= 2;
    const accountOf = new Map(group.map((feature) => [feature.post.id, feature.post.account]));

    for (const feature of group) {
      if (feature.post.account === originHandle) {
        roleOf.set(feature.post.id, "originator");
        matchedId.set(feature.post.id, null);
        matchedJ.set(feature.post.id, 0);
        matchedG.set(feature.post.id, 0);
        continue;
      }
      if (syndicatingCluster && isSyndicatingOutlet(feature.post.account)) {
        const prior = roleOf.get(feature.post.id);
        // A paraphrase among syndicating outlets is syndicated. An exact copy is not.
        if (prior !== "exact") {
          roleOf.set(feature.post.id, "syndicated");
          continue;
        }
      }
      const prior = roleOf.get(feature.post.id);
      const matchKind = prior === "exact" || prior === "near" || prior === "template" ? prior : null;
      const matchedAccount = accountOf.get(matchedId.get(feature.post.id) ?? "") ?? null;
      const creditRole = creditRoleFor(
        feature.credits,
        originHandle,
        clusterHandles,
        handleByKey,
        matchKind,
        matchedAccount,
      );
      if (creditRole) roleOf.set(feature.post.id, creditRole);
    }
  }

  const narrativeOrigin = new Map<string, string>();
  for (const feature of features) {
    const narrativeId = feature.post.narrativeId;
    if (!narrativeId || narrativeOrigin.has(narrativeId)) continue;
    narrativeOrigin.set(narrativeId, feature.post.id);
  }
  const narrativeOriginAccount = new Map<string, string>();
  for (const [narrativeId, postId] of narrativeOrigin) {
    const feature = features.find((item) => item.post.id === postId);
    if (feature) narrativeOriginAccount.set(narrativeId, feature.post.account);
  }

  const accountDirectory = new Map(corpus.accounts.map((account) => [account.handle, account]));
  const ageById = new Map(
    features.map((feature) => [feature.post.id, ageOfPoster(feature.post, accountDirectory)]),
  );

  const posts: AnnotatedPost[] = features.map((feature) => {
    const role = roleOf.get(feature.post.id) ?? "solo";
    const clusterId = clusterOf.get(feature.post.id) ?? feature.post.id;
    const inCluster = members.has(clusterId);
    const origin = inCluster ? members.get(clusterId)?.[0] : undefined;
    const match = matchedId.get(feature.post.id) ?? null;
    const matchedFeature = match ? featureById.get(match) : undefined;
    const narrativeId = feature.post.narrativeId;
    const isNarrativeOriginatorPost = narrativeId
      ? narrativeOrigin.get(narrativeId) === feature.post.id
      : false;
    const sourceAccounts = new Set<string>();
    if (narrativeId) {
      const source = narrativeOriginAccount.get(narrativeId);
      if (source) sourceAccounts.add(source);
    }
    for (const frameId of feature.frameNarrativeIds) {
      const source = narrativeOriginAccount.get(frameId);
      if (source) sourceAccounts.add(source);
    }
    const isClone = isCopyRole(role);
    const onNarrative = narrativeId !== null || feature.frameNarrativeIds.length > 0;
    const quoteTokens = tokensOf(normalizeText(feature.post.text)).length;
    const quoteCommentary = feature.post.action === "quote" && quoteTokens >= 4;
    const bareQuote = onNarrative && feature.post.action === "quote" && !quoteCommentary;
    const replyBoost = onNarrative && feature.post.action === "reply";
    const sloganReuse = feature.frameNarrativeIds.length > 0 && role === "solo";
    const tracked = Boolean(accountDirectory.get(feature.post.account)?.trackedBoard);
    const isBoost =
      !feature.isRetweet &&
      feature.post.action !== "repost" &&
      !isClone &&
      role !== "attributed" &&
      role !== "syndicated" &&
      role !== "originator" &&
      role !== "outside" &&
      !tracked &&
      !sourceAccounts.has(feature.post.account) &&
      (bareQuote || replyBoost || sloganReuse);
    const age = ageById.get(feature.post.id) ?? {
      accountCreatedAt: null,
      ageDays: null,
      ageBand: "unknown" as const,
    };

    return {
      id: feature.post.id,
      account: feature.post.account,
      text: feature.post.text,
      postedAt: feature.post.postedAt,
      narrativeId,
      action: feature.post.action,
      url: feature.post.url,
      source: feature.post.source ?? null,
      textTruncated: feature.post.textTruncated || undefined,
      normalized: feature.normalized,
      hash: feature.hash,
      tokenCount: feature.tokens.length,
      isRetweet: feature.isRetweet,
      clusterId: inCluster ? clusterId : null,
      role,
      matchedPostId: match,
      matchedAccount: matchedFeature?.post.account ?? null,
      jaccard: matchedJ.get(feature.post.id) ?? 0,
      sharedFourGrams: matchedG.get(feature.post.id) ?? 0,
      latencyMs: origin && feature.post.id !== origin.post.id
        ? Date.parse(feature.post.postedAt) - Date.parse(origin.post.postedAt)
        : null,
      frameNarrativeIds: feature.frameNarrativeIds,
      framePhrases: feature.framePhrases,
      isNarrativeOriginatorPost,
      isBoost,
      accountCreatedAt: age.accountCreatedAt,
      ageDays: age.ageDays,
      ageBand: age.ageBand,
    };
  });

  const postById = new Map(posts.map((post) => [post.id, post]));

  const clusters: CloneCluster[] = [...members.entries()]
    .map(([id, group]) => buildCluster(id, group, postById, accountDirectory, false))
    .sort((a, b) => b.cloneCount - a.cloneCount || compareText(a.originAt, b.originAt));

  const accounts = gradeAccounts(posts, corpus.accounts);
  const narratives = gradeNarratives(corpus, posts, accounts);
  const edges = narrativeEdges(posts);

  const clonePostCount = posts.filter((post) => isCopyRole(post.role)).length;

  return {
    posts,
    clusters,
    accounts,
    narratives,
    edges,
    totals: {
      postCount: posts.length,
      narrativeCount: corpus.narratives.length,
      clusterCount: clusters.length,
      clonePostCount,
      amplifierAccountCount: accounts.filter(
        (account) => account.label === "Amplifier" || account.label === "Clone+Amp",
      ).length,
      freshPostCount: posts.filter((post) => post.ageBand === "fresh").length,
      underYearPostCount: posts.filter(
        (post) => post.ageBand === "fresh" || post.ageBand === "young",
      ).length,
      newAccountNarrativeCount: narratives.filter((narrative) => narrative.age.newAccountsDominate)
        .length,
    },
  };
}

function ageFromPosts(posts: AnnotatedPost[]): ResolvedAge {
  let best: AnnotatedPost | null = null;
  for (const post of posts) {
    if (post.ageDays === null) continue;
    if (!best || (best.ageDays ?? -1) < post.ageDays) best = post;
  }
  if (!best) return { accountCreatedAt: null, ageDays: null, ageBand: "unknown" };
  return {
    accountCreatedAt: best.accountCreatedAt,
    ageDays: best.ageDays,
    ageBand: best.ageBand,
  };
}

function rank(kind: MatchKind): number {
  if (kind === "exact") return 3;
  if (kind === "near") return 2;
  return 1;
}

function resolveCredit(credit: SourceCredit, handleByKey: Map<string, string>): string | null {
  const key = credit.name.toLowerCase();
  return handleByKey.get(key) ?? null;
}

function wordingCopied(current: string[], previous: string[]): boolean {
  if (current.length === 0 || previous.length === 0) return false;
  const left = current.join(" ");
  const right = previous.join(" ");
  return left.includes(right) || right.includes(left);
}

/**
 * Similarity only. Credit text never drops a near or template match.
 * A syndicating outlet's template paraphrase is not a clone. Exact copies, including
 * exact copies between two syndicating outlets, stay matches.
 */
function pairMatch(
  current: Features,
  prev: Features,
): { kind: MatchKind; score: number; shared: number } | null {
  let kind: MatchKind | null = null;
  let score = 0;
  let shared = 0;
  const truncated = Boolean(current.post.textTruncated || prev.post.textTruncated);
  if (current.hash === prev.hash) {
    kind = "exact";
    score = 1;
    shared = sharedCount(current.grams, prev.grams);
  } else if (!truncated) {
    score = jaccard(current.tokenSet, prev.tokenSet);
    shared = sharedCount(current.grams, prev.grams);
    if (score >= THRESHOLDS.nearDupeJaccard) kind = "near";
    else if (
      shared >= THRESHOLDS.templateSharedFourGrams &&
      score >= THRESHOLDS.templateJaccard
    ) {
      kind = "template";
    }
  }
  // Template paraphrases by a syndicating outlet are not clones. Exact is never cleared.
  if (kind === "template" && isSyndicatingOutlet(current.post.account) && !wordingCopied(current.tokens, prev.tokens)) {
    kind = null;
  }
  if (!kind) return null;
  return { kind, score, shared };
}

function creditsOutletAccount(credits: SourceCredit[], handle: string): boolean {
  return credits.some(
    (credit) => credit.kind === "outlet" && outletAccounts(credit.name).includes(handle),
  );
}

function creditQualifies(
  credit: SourceCredit,
  originHandle: string,
  clusterHandles: Set<string>,
  handleByKey: Map<string, string>,
  matchKind: MatchKind | null,
  matchedAccount: string | null,
): boolean {
  if (!credit.name) return false;
  if (credit.kind === "handle" || credit.kind === "tip") {
    return resolveCredit(credit, handleByKey) === originHandle;
  }
  if (!isRecognizedNewsOutlet(credit.name)) return false;
  const outlets = outletAccounts(credit.name);
  const postedHere = outlets.some((handle) => handle === originHandle || clusterHandles.has(handle));
  if (!postedHere) return false;
  // A verbatim or near copy of some other account stays a copy. The credit
  // does not wash it, even when the outlet's own account is in the cluster.
  if ((matchKind === "exact" || matchKind === "near") && matchedAccount && !outlets.includes(matchedAccount)) {
    return false;
  }
  return true;
}

/** Weight 0 only for this post, and only when rule 1 says the credit counts. */
function creditRoleFor(
  credits: SourceCredit[],
  originHandle: string,
  clusterHandles: Set<string>,
  handleByKey: Map<string, string>,
  matchKind: MatchKind | null,
  matchedAccount: string | null,
): "attributed" | "syndicated" | null {
  const qualifying = credits.filter((credit) =>
    creditQualifies(credit, originHandle, clusterHandles, handleByKey, matchKind, matchedAccount),
  );
  if (qualifying.length === 0) return null;
  if (qualifying.some((credit) => credit.kind === "handle" || credit.kind === "tip")) return "attributed";
  return "syndicated";
}

function cloneLabelHit(clonePosts: AnnotatedPost[], totalPosts: number, cloneScore: number): boolean {
  if (cloneScore < THRESHOLDS.cloneLabel) return false;
  const hard = clonePosts.filter((post) => post.role === "exact" || post.role === "near");
  if (hard.length > 0) return true;
  const templates = clonePosts.filter((post) => post.role === "template");
  if (templates.length >= THRESHOLDS.cloneMinTemplateMatches) return true;
  const share = totalPosts === 0 ? 0 : clonePosts.length / totalPosts;
  return templates.length > 0 && share >= THRESHOLDS.cloneShareThreshold;
}

function buildCluster(
  id: string,
  group: Features[],
  postById: Map<string, AnnotatedPost>,
  directory: Map<string, FixtureAccount>,
  sourceOutside: boolean,
): CloneCluster {
  const annotated = group
    .map((feature) => postById.get(feature.post.id))
    .filter((post): post is AnnotatedPost => Boolean(post));
  const origin = annotated.find((post) => post.role === "originator") ?? annotated[0];
  const clones = annotated.filter((post) => isCopyRole(post.role));
  const accounts = [...new Set(annotated.map((post) => post.account))];
  const mutualFollows: FollowLink[] = [];
  const oneWayFollows: FollowLink[] = [];

  for (let i = 0; i < accounts.length; i++) {
    for (let j = i + 1; j < accounts.length; j++) {
      const left = directory.get(accounts[i]);
      const right = directory.get(accounts[j]);
      const leftFollows = left?.follows.includes(accounts[j]) ?? false;
      const rightFollows = right?.follows.includes(accounts[i]) ?? false;
      if (leftFollows && rightFollows) {
        mutualFollows.push({ from: accounts[i], to: accounts[j] });
      } else if (leftFollows) {
        oneWayFollows.push({ from: accounts[i], to: accounts[j] });
      } else if (rightFollows) {
        oneWayFollows.push({ from: accounts[j], to: accounts[i] });
      }
    }
  }

  return {
    id,
    narrativeId: origin.narrativeId,
    originPostId: origin.id,
    originAccount: sourceOutside ? null : origin.account,
    originAt: origin.postedAt,
    sourceOutside,
    sampleText: origin.text,
    normalizedSample: origin.normalized,
    posts: annotated,
    cloneCount: clones.length,
    exactCount: clones.filter((post) => post.role === "exact").length,
    nearCount: clones.filter((post) => post.role === "near").length,
    templateCount: clones.filter((post) => post.role === "template").length,
    attributedCount: annotated.filter((post) => post.role === "attributed").length,
    syndicatedCount: annotated.filter((post) => post.role === "syndicated").length,
    outsideCount: annotated.filter((post) => post.role === "outside").length,
    accounts,
    mutualFollows,
    oneWayFollows,
    age: summarizeAges(annotated.map((post) => post.ageBand)),
  };
}

function gradeAccounts(posts: AnnotatedPost[], directory: FixtureAccount[]): AccountReport[] {
  const byHandle = new Map<string, AnnotatedPost[]>();
  for (const post of posts) {
    const list = byHandle.get(post.account);
    if (list) list.push(post);
    else byHandle.set(post.account, [post]);
  }
  const known = new Map(directory.map((account) => [account.handle, account]));
  const handles = new Set<string>([...known.keys(), ...byHandle.keys()]);

  const reports: AccountReport[] = [];
  for (const handle of handles) {
    const owned = byHandle.get(handle) ?? [];
    const meta = known.get(handle) ?? blankAccount(handle);
    if (owned.length === 0 && !meta.trackedBoard) continue;
    const age = known.has(handle)
      ? resolveAge({ accountCreatedAt: meta.accountCreatedAt, joined: meta.joined })
      : ageFromPosts(owned);
    const clonePosts = owned.filter((post) => isCopyRole(post.role));
    const attributedPosts = owned.filter((post) => post.role === "attributed");
    const syndicatedPosts = owned.filter((post) => post.role === "syndicated");
    const boostPosts = owned.filter((post) => post.isBoost);
    const originPosts = owned.filter(
      (post) => post.role === "originator" || post.isNarrativeOriginatorPost,
    );
    let cloneScore = 0;
    for (const post of clonePosts) {
      if (post.role === "exact" || post.role === "near" || post.role === "template") {
        cloneScore += cloneWeight(post.role);
      }
    }
    cloneScore += attributedPosts.length * THRESHOLDS.cloneAttributedWeight;
    cloneScore = Math.min(100, cloneScore);

    const boostDays = new Set(boostPosts.map((post) => dayKey(post.postedAt))).size;
    const activeDays = new Set(owned.map((post) => dayKey(post.postedAt))).size;
    const timelinePostCount = owned.filter((post) => countsAsTimeline(post.source)).length;
    const inNarrative = owned.filter(
      (post) => post.narrativeId !== null || post.frameNarrativeIds.length > 0,
    ).length;
    const load = owned.length === 0 ? 0 : inNarrative / owned.length;
    const boostRatio = owned.length === 0 ? 0 : boostPosts.length / owned.length;
    const persistence = Math.min(1, boostDays / THRESHOLDS.persistenceDaysForFull);
    const originality = owned.length === 0 ? 0 : originPosts.length / owned.length;
    const volume = Math.min(1, boostPosts.length / THRESHOLDS.ampVolumePostsForFull);
    const ampScore =
      boostPosts.length === 0
        ? 0
        : Math.round(
            100 *
              (THRESHOLDS.ampBoostWeight * boostRatio +
                THRESHOLDS.ampLoadWeight * load +
                THRESHOLDS.ampPersistenceWeight * persistence +
                THRESHOLDS.ampOriginalityWeight * (1 - originality) +
                THRESHOLDS.ampVolumeWeight * volume),
          );

    const passesAmpGate = passesAmplifierGate(ampScore, boostPosts.length, boostDays, timelinePostCount);
    const cloneHit = cloneLabelHit(clonePosts, owned.length, cloneScore);
    const graded = owned.length >= THRESHOLDS.leaderboardMinPosts;
    let label: AccountLabel = "Clean";
    if (cloneHit && passesAmpGate) label = "Clone+Amp";
    else if (cloneHit) label = "Clone";
    else if (passesAmpGate) label = "Amplifier";
    else if (originPosts.length > 0) label = "Originator";

    const narrativeIds = [
      ...new Set(
        owned.flatMap((post) => [
          ...(post.narrativeId ? [post.narrativeId] : []),
          ...post.frameNarrativeIds,
        ]),
      ),
    ];
    const clusterIds = [
      ...new Set(
        owned.map((post) => post.clusterId).filter((id): id is string => id !== null),
      ),
    ];

    reports.push({
      handle,
      name: meta.name,
      bio: meta.bio,
      joined: meta.joined,
      followers: meta.followers,
      following: meta.following,
      follows: meta.follows,
      inDirectory: known.has(handle),
      cloneScore,
      ampScore,
      gcScore: gcScoreFrom(cloneScore, ampScore),
      graded,
      label,
      postCount: owned.length,
      timelinePostCount,
      clonePostCount: clonePosts.length,
      attributedPostCount: attributedPosts.length,
      syndicatedPostCount: syndicatedPosts.length,
      boostPostCount: boostPosts.length,
      originPostCount: originPosts.length,
      boostDays,
      activeDays,
      narrativeIds,
      clusterIds,
      passesAmpGate,
      accountCreatedAt: age.accountCreatedAt,
      ageDays: age.ageDays,
      ageBand: age.ageBand,
    });
  }

  return reports.sort((a, b) => compareText(a.handle, b.handle));
}

function gradeNarratives(
  corpus: Corpus,
  posts: AnnotatedPost[],
  accounts: AccountReport[],
): NarrativeVolume[] {
  return corpus.narratives
    .map((narrative) => {
      const related = posts.filter(
        (post) =>
          post.narrativeId === narrative.id || post.frameNarrativeIds.includes(narrative.id),
      );
      const accountSet = new Set(related.map((post) => post.account));
      let originPosts = 0;
      let clonePosts = 0;
      let boostPosts = 0;
      let otherPosts = 0;
      const cloneAccounts = new Set<string>();
      const ampAccounts = new Set<string>();
      let freshBoostPosts = 0;
      let underYearBoostPosts = 0;
      for (const post of related) {
        const account = accounts.find((item) => item.handle === post.account);
        if (post.isNarrativeOriginatorPost || post.role === "originator") originPosts += 1;
        else if (isCopyRole(post.role)) {
          clonePosts += 1;
          cloneAccounts.add(post.account);
        } else if (post.isBoost) {
          boostPosts += 1;
          ampAccounts.add(post.account);
        } else otherPosts += 1;
        if (account && (account.label === "Amplifier" || account.label === "Clone+Amp")) {
          ampAccounts.add(post.account);
        }
        const underYear = post.ageBand === "fresh" || post.ageBand === "young";
        if (post.isBoost && post.ageBand === "fresh") freshBoostPosts += 1;
        if (post.isBoost && underYear) underYearBoostPosts += 1;
      }
      const origin = related.find((post) => post.isNarrativeOriginatorPost);
      return {
        id: narrative.id,
        title: narrative.title,
        shortLabel: narrative.shortLabel,
        topic: narrative.topic,
        summary: narrative.summary,
        postCount: related.length,
        accountCount: accountSet.size,
        originPosts,
        clonePosts,
        boostPosts,
        otherPosts,
        originAccount: origin?.account ?? null,
        firstSeen: origin?.postedAt ?? null,
        cloneAccountCount: cloneAccounts.size,
        ampAccountCount: ampAccounts.size,
        age: summarizeAges(related.map((post) => post.ageBand)),
        freshBoostPosts,
        underYearBoostPosts,
      };
    })
    .sort((a, b) => b.postCount - a.postCount || compareText(a.title, b.title));
}

function narrativeEdges(posts: AnnotatedPost[]): NarrativeEdge[] {
  const byAccount = new Map<string, Set<string>>();
  for (const post of posts) {
    const ids = new Set<string>([
      ...(post.narrativeId ? [post.narrativeId] : []),
      ...post.frameNarrativeIds,
    ]);
    if (ids.size === 0) continue;
    const existing = byAccount.get(post.account);
    if (existing) {
      for (const id of ids) existing.add(id);
    } else {
      byAccount.set(post.account, ids);
    }
  }

  const weights = new Map<string, number>();
  for (const ids of byAccount.values()) {
    const list = [...ids].sort();
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const key = `${list[i]}|${list[j]}`;
        weights.set(key, (weights.get(key) ?? 0) + 1);
      }
    }
  }

  return [...weights.entries()]
    .map(([key, sharedAccounts]) => {
      const [source, target] = key.split("|");
      return { source, target, sharedAccounts };
    })
    .sort((a, b) => b.sharedAccounts - a.sharedAccounts || compareText(a.source, b.source));
}
