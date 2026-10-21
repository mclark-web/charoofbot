export type PostAction = "post" | "quote" | "reply" | "repost";

export type FixturePost = {
  id: string;
  account: string;
  text: string;
  postedAt: string;
  narrativeId: string | null;
  action: PostAction;
  /** Public post URL when the corpus row has one. Paste posts omit it. */
  url?: string;
  /** In-corpus post this row credits, when the CSV names one. Always an earlier post. */
  refPostId?: string | null;
  /** How the row was collected. Omitted rows count as timeline. phrase-search and quotes do not. */
  source?: string | null;
  /** The stored text is an incomplete preview. Near and template matches skip it. */
  textTruncated?: boolean;
  /** Optional poster created date. Fixture posts inherit this from the account directory. */
  accountCreatedAt?: string;
  /** Optional age in days at the fixture clock, used when no created date is present. */
  ageDays?: number;
};

export type FixtureAccount = {
  handle: string;
  name: string;
  bio: string;
  joined: string;
  /** Calendar date the fixture account was created. Demo ages use this field. */
  accountCreatedAt?: string;
  followers: number;
  following: number;
  follows: string[];
  /** GradedCalls lane (fintwit or sports) when this account is a tracked source. */
  trackedBoard?: string | null;
};

export type AgeBand = "fresh" | "young" | "established" | "unknown";

export type AgeVolume = {
  freshPostCount: number;
  /** Posts from accounts that are at least 30 days old and under 1 year. */
  youngPostCount: number;
  /** Fresh plus young: every post from an account under 1 year. */
  underYearPostCount: number;
  establishedPostCount: number;
  unknownAgePostCount: number;
  freshVolumePct: number;
  underYearVolumePct: number;
  freshAccountsDominate: boolean;
  newAccountsDominate: boolean;
};

export type Narrative = {
  id: string;
  title: string;
  shortLabel: string;
  topic: string;
  summary: string;
  framePhrases: string[];
};

/** A sampled reposter of a seed post. This is not a post row. */
export type Reposter = {
  repostedPostId: string;
  narrativeId: string;
  handle: string;
  accountCreatedAt: string;
  followers: number;
  following: number;
};

/** New-account share among sampled reposters of one narrative. */
export type ReposterSample = {
  reposters: number;
  under1y: number;
  under30d: number;
};

export type Corpus = {
  narratives: Narrative[];
  accounts: FixtureAccount[];
  posts: FixturePost[];
  /** Omitted on the practice set. The live corpus lists sampled reposters. */
  reposters?: Reposter[];
};

export type MatchKind = "exact" | "near" | "template";

export type PostRole = "originator" | MatchKind | "attributed" | "syndicated" | "outside" | "solo";

export type AccountLabel =
  | "Originator"
  | "Clone"
  | "Amplifier"
  | "Clone+Amp"
  | "Clean";

export type AnnotatedPost = {
  id: string;
  account: string;
  text: string;
  postedAt: string;
  narrativeId: string | null;
  action: PostAction;
  url?: string;
  source?: string | null;
  textTruncated?: boolean;
  normalized: string;
  hash: string;
  tokenCount: number;
  isRetweet: boolean;
  clusterId: string | null;
  role: PostRole;
  matchedPostId: string | null;
  matchedAccount: string | null;
  jaccard: number;
  sharedFourGrams: number;
  latencyMs: number | null;
  frameNarrativeIds: string[];
  framePhrases: string[];
  isNarrativeOriginatorPost: boolean;
  isBoost: boolean;
  accountCreatedAt: string | null;
  ageDays: number | null;
  ageBand: AgeBand;
};

export type FollowLink = {
  from: string;
  to: string;
};

export type CloneCluster = {
  id: string;
  narrativeId: string | null;
  originPostId: string;
  /** Null when the named source is not an account in this cluster. */
  originAccount: string | null;
  originAt: string;
  /** The wording names a source that is not the earliest in-corpus poster. */
  sourceOutside: boolean;
  sampleText: string;
  normalizedSample: string;
  posts: AnnotatedPost[];
  cloneCount: number;
  exactCount: number;
  nearCount: number;
  templateCount: number;
  attributedCount: number;
  syndicatedCount: number;
  outsideCount: number;
  accounts: string[];
  mutualFollows: FollowLink[];
  oneWayFollows: FollowLink[];
  age: AgeVolume;
};

export type AccountReport = {
  handle: string;
  name: string;
  bio: string;
  joined: string;
  followers: number;
  following: number;
  follows: string[];
  inDirectory: boolean;
  cloneScore: number;
  ampScore: number;
  /** Authenticity: 100 − the copy score. Amplifier detection is not in this number. */
  gcScore: number;
  /** False when the account has a thin sample in the fixed window. The grade line is withheld. */
  graded: boolean;
  label: AccountLabel;
  postCount: number;
  /** Posts collected from a timeline. Phrase-search and quote-search rows do not count. */
  timelinePostCount: number;
  clonePostCount: number;
  attributedPostCount: number;
  syndicatedPostCount: number;
  boostPostCount: number;
  originPostCount: number;
  boostDays: number;
  activeDays: number;
  narrativeIds: string[];
  clusterIds: string[];
  passesAmpGate: boolean;
  accountCreatedAt: string | null;
  ageDays: number | null;
  ageBand: AgeBand;
};

export type NarrativeVolume = {
  id: string;
  title: string;
  shortLabel: string;
  topic: string;
  summary: string;
  postCount: number;
  accountCount: number;
  originPosts: number;
  clonePosts: number;
  boostPosts: number;
  otherPosts: number;
  originAccount: string | null;
  firstSeen: string | null;
  cloneAccountCount: number;
  ampAccountCount: number;
  age: AgeVolume;
  freshBoostPosts: number;
  underYearBoostPosts: number;
  /** Null when this narrative has no reposter sample. */
  reposters: ReposterSample | null;
};

export type NarrativeEdge = {
  source: string;
  target: string;
  sharedAccounts: number;
};

export type Report = {
  posts: AnnotatedPost[];
  clusters: CloneCluster[];
  accounts: AccountReport[];
  narratives: NarrativeVolume[];
  edges: NarrativeEdge[];
  /** Score window and the age clock used for this report. */
  clock: {
    start: string;
    end: string;
    asOf: string;
  };
  totals: {
    postCount: number;
    narrativeCount: number;
    clusterCount: number;
    clonePostCount: number;
    amplifierAccountCount: number;
    freshPostCount: number;
    underYearPostCount: number;
    newAccountNarrativeCount: number;
  };
};
