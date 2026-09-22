export type PostAction = "post" | "quote" | "reply";

export type FixturePost = {
  id: string;
  account: string;
  text: string;
  postedAt: string;
  narrativeId: string | null;
  action: PostAction;
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

export type Corpus = {
  narratives: Narrative[];
  accounts: FixtureAccount[];
  posts: FixturePost[];
};

export type MatchKind = "exact" | "near" | "template";

export type PostRole = "originator" | MatchKind | "solo";

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
  originAccount: string;
  originAt: string;
  sampleText: string;
  normalizedSample: string;
  posts: AnnotatedPost[];
  cloneCount: number;
  exactCount: number;
  nearCount: number;
  templateCount: number;
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
  label: AccountLabel;
  postCount: number;
  clonePostCount: number;
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
