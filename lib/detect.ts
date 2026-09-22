import { ageOfPoster, resolveAge, summarizeAges, type ResolvedAge } from "./age";
import { sha256 } from "./hash";
import {
  fourGrams,
  jaccard,
  normalizeText,
  peelRetweet,
  sharedCount,
  tokensOf,
} from "./normalize";
import { THRESHOLDS } from "./thresholds";
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
    isRetweet: peeled.isRetweet,
    frameNarrativeIds: frames.ids,
    framePhrases: frames.phrases,
  };
}

function cloneWeight(kind: MatchKind): number {
  if (kind === "exact") return THRESHOLDS.cloneExactWeight;
  if (kind === "near") return THRESHOLDS.cloneNearWeight;
  return THRESHOLDS.cloneTemplateWeight;
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function blankAccount(handle: string): FixtureAccount {
  return {
    handle,
    name: handle,
    bio: "Not in the fixture directory.",
    joined: "",
    followers: 0,
    following: 0,
    follows: [],
  };
}

export function analyzeCorpus(corpus: Corpus): Report {
  const ordered = [...corpus.posts].sort(
    (a, b) => a.postedAt.localeCompare(b.postedAt) || a.id.localeCompare(b.id),
  );
  const features = ordered.map((post) => featurize(post, corpus.narratives));

  const clusterOf = new Map<string, string>();
  const roleOf = new Map<string, PostRole>();
  const matchedId = new Map<string, string | null>();
  const matchedJ = new Map<string, number>();
  const matchedG = new Map<string, number>();

  for (let index = 0; index < features.length; index++) {
    const current = features[index];
    clusterOf.set(current.post.id, current.post.id);
    roleOf.set(current.post.id, "solo");
    matchedId.set(current.post.id, null);
    matchedJ.set(current.post.id, 0);
    matchedG.set(current.post.id, 0);

    if (current.isRetweet || current.tokens.length < THRESHOLDS.minTokens) continue;

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
      if (prev.isRetweet || prev.tokens.length < THRESHOLDS.minTokens) continue;
      const delta = currentMs - Date.parse(prev.post.postedAt);
      if (delta < 0 || delta > WINDOW_MS) continue;

      let kind: MatchKind | null = null;
      let score = 0;
      let shared = 0;
      if (current.hash === prev.hash) {
        kind = "exact";
        score = 1;
        shared = sharedCount(current.grams, prev.grams);
      } else {
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
      if (!kind) continue;

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
    } else {
      const origin = group[0];
      roleOf.set(origin.post.id, "originator");
      matchedId.set(origin.post.id, null);
      matchedJ.set(origin.post.id, 0);
      matchedG.set(origin.post.id, 0);
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

  const featureById = new Map(features.map((feature) => [feature.post.id, feature]));
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
    const isClone = role === "exact" || role === "near" || role === "template";
    const onNarrative = narrativeId !== null || feature.frameNarrativeIds.length > 0;
    const engage =
      onNarrative && (feature.post.action === "quote" || feature.post.action === "reply");
    const sloganReuse = feature.frameNarrativeIds.length > 0 && role === "solo";
    const isBoost =
      !feature.isRetweet &&
      !isClone &&
      role !== "originator" &&
      !sourceAccounts.has(feature.post.account) &&
      (engage || sloganReuse);
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
    .map(([id, group]) => buildCluster(id, group, postById, accountDirectory))
    .sort((a, b) => b.cloneCount - a.cloneCount || a.originAt.localeCompare(b.originAt));

  const accounts = gradeAccounts(posts, corpus.accounts);
  const narratives = gradeNarratives(corpus, posts, accounts);
  const edges = narrativeEdges(posts);

  const clonePostCount = posts.filter(
    (post) => post.role === "exact" || post.role === "near" || post.role === "template",
  ).length;

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

function buildCluster(
  id: string,
  group: Features[],
  postById: Map<string, AnnotatedPost>,
  directory: Map<string, FixtureAccount>,
): CloneCluster {
  const annotated = group
    .map((feature) => postById.get(feature.post.id))
    .filter((post): post is AnnotatedPost => Boolean(post));
  const origin = annotated[0];
  const clones = annotated.filter((post) => post.role !== "originator");
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
    originAccount: origin.account,
    originAt: origin.postedAt,
    sampleText: origin.text,
    normalizedSample: origin.normalized,
    posts: annotated,
    cloneCount: clones.length,
    exactCount: clones.filter((post) => post.role === "exact").length,
    nearCount: clones.filter((post) => post.role === "near").length,
    templateCount: clones.filter((post) => post.role === "template").length,
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
    if (owned.length === 0) continue;
    const meta = known.get(handle) ?? blankAccount(handle);
    const age = known.has(handle)
      ? resolveAge({ accountCreatedAt: meta.accountCreatedAt, joined: meta.joined })
      : ageFromPosts(owned);
    const clonePosts = owned.filter(
      (post) => post.role === "exact" || post.role === "near" || post.role === "template",
    );
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
    cloneScore = Math.min(100, cloneScore);

    const boostDays = new Set(boostPosts.map((post) => dayKey(post.postedAt))).size;
    const activeDays = new Set(owned.map((post) => dayKey(post.postedAt))).size;
    const inNarrative = owned.filter(
      (post) => post.narrativeId !== null || post.frameNarrativeIds.length > 0,
    ).length;
    const load = inNarrative / owned.length;
    const boostRatio = boostPosts.length / owned.length;
    const persistence = Math.min(1, boostDays / THRESHOLDS.persistenceDaysForFull);
    const originality = originPosts.length / owned.length;
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

    const passesAmpGate =
      ampScore >= THRESHOLDS.ampLabel &&
      boostPosts.length >= THRESHOLDS.ampMinBoostPosts &&
      boostDays >= THRESHOLDS.ampMinBoostDays;
    const cloneHit = cloneScore >= THRESHOLDS.cloneLabel;
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
      label,
      postCount: owned.length,
      clonePostCount: clonePosts.length,
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

  return reports.sort((a, b) => a.handle.localeCompare(b.handle));
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
        else if (post.role === "exact" || post.role === "near" || post.role === "template") {
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
    .sort((a, b) => b.postCount - a.postCount || a.title.localeCompare(b.title));
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
    .sort((a, b) => b.sharedAccounts - a.sharedAccounts || a.source.localeCompare(b.source));
}
