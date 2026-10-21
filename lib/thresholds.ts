/** Public scoring constants. The methodology page renders these values. */
export const THRESHOLDS = {
  /** Token Jaccard at or above this is a near-duplicate. */
  nearDupeJaccard: 0.85,
  /** Minimum token Jaccard for a template (shared skeleton) match. */
  templateJaccard: 0.5,
  /** Minimum shared 4-grams for a template match. */
  templateSharedFourGrams: 2,
  /** Shorter normalized texts are not clustered. */
  minTokens: 8,
  /**
   * A truncated row can still be copied when its stored prefix is at least this
   * long. The prefix drops a trailing t.co link and the partial last word.
   */
  prefixMinChars: 120,
  /** Copies only join a cluster inside this window after first seen. */
  clusterWindowHours: 14 * 24,
  cloneExactWeight: 70,
  cloneNearWeight: 55,
  cloneTemplateWeight: 45,
  /**
   * Explicit credit (via @handle, Source: @handle, or h/t plus a source) and attributed syndication
   * (per / via / Source: / 출처: plus an outlet name) add nothing to the copy score. A bare h/t does not.
   * The post stays visible as attributed or syndicated.
   */
  cloneAttributedWeight: 0,
  cloneLabel: 40,
  /**
   * A lone template match is 45, which is over the clone line, but it does not
   * label the account Clone. Two or more template matches do. So does one
   * template match when copied posts are at least this share of the window.
   */
  cloneMinTemplateMatches: 2,
  cloneShareThreshold: 0.5,
  ampLabel: 45,
  /** Amplifier label requires repeated boosts, not a single slogan. */
  ampMinBoostPosts: 3,
  ampMinBoostDays: 3,
  /**
   * Posts from the account's own timeline required before a boost pattern can flag.
   * Phrase-search and quote-search rows are not a timeline.
   */
  ampTimelineBaseline: 3,
  ampBoostWeight: 0.3,
  ampLoadWeight: 0.2,
  ampPersistenceWeight: 0.15,
  ampOriginalityWeight: 0.1,
  /** Share of the grade that scales with how many boost posts were made. */
  ampVolumeWeight: 0.25,
  /** Boost-post count at which the volume term saturates. */
  ampVolumePostsForFull: 6,
  /** Boost-days at which the persistence term saturates. */
  persistenceDaysForFull: 3,
  /** Account age under this many days is fresh (the stricter new-account band). */
  freshAccountDays: 30,
  /** Account age under this many days is still new. Fresh accounts are included. */
  youngAccountDays: 365,
  /**
   * Share of posts from accounts under 1 year at which a cluster or narrative
   * is marked as dominated by new accounts. The fresh band uses the same share.
   */
  newAccountDominateShare: 0.5,
  /**
   * Fixed window and the minimum sample. Fewer posts in the window are a thin
   * sample: the grade line reads "thin sample / not graded yet".
   */
  leaderboardMinPosts: 5,
} as const;

/** First inclusive UTC day. The window end is the latest post's UTC date, not a fixed close. */
export const SCORE_WINDOW_START = "2026-10-04";

export type ScoreClock = {
  start: string;
  end: string;
  /** Instant account ages are measured against. */
  asOf: string;
};

/**
 * Practice-set clock. Paste and fixture tests pin this so a later corpus
 * does not move their ages or drop their posts.
 */
export const FIXTURE_CLOCK: ScoreClock = {
  start: SCORE_WINDOW_START,
  end: "2026-10-18",
  asOf: "2026-10-18T21:00:00.000Z",
};

/** As-of stamp for the practice set (18 Oct 2026, 5:00 PM ET). The live corpus does not use this. */
export const DEMO_PASTE_STAMP = FIXTURE_CLOCK.asOf;

/**
 * Window end and the age clock follow the latest post unless a fixture pins them.
 * A partial pin overrides only the fields it sets.
 */
export function clockFromPosts(posts: { postedAt: string }[], pin?: Partial<ScoreClock>): ScoreClock {
  let latest = "";
  for (const post of posts) {
    if (post.postedAt > latest) latest = post.postedAt;
  }
  const end = pin?.end ?? (latest ? latest.slice(0, 10) : SCORE_WINDOW_START);
  const asOf = pin?.asOf ?? (latest || `${end}T00:00:00.000Z`);
  return {
    start: pin?.start ?? SCORE_WINDOW_START,
    end,
    asOf,
  };
}

/** Same predicate detect.ts uses for the amplifier label. Display must not invent a second gate. */
export function passesAmplifierGate(
  ampScore: number,
  boostPostCount: number,
  boostDays: number,
  timelinePostCount: number = THRESHOLDS.ampTimelineBaseline,
): boolean {
  return (
    ampScore >= THRESHOLDS.ampLabel &&
    boostPostCount >= THRESHOLDS.ampMinBoostPosts &&
    boostDays >= THRESHOLDS.ampMinBoostDays &&
    timelinePostCount >= THRESHOLDS.ampTimelineBaseline
  );
}

/** Practice-set default when a caller does not pass a clock. Live reports use the latest post. */
export const AGE_AS_OF = DEMO_PASTE_STAMP;
