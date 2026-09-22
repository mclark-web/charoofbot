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
  /** Copies only join a cluster inside this window after first seen. */
  clusterWindowHours: 14 * 24,
  cloneExactWeight: 70,
  cloneNearWeight: 55,
  cloneTemplateWeight: 45,
  cloneLabel: 40,
  ampLabel: 45,
  /** Amplifier label requires repeated boosts, not a single slogan. */
  ampMinBoostPosts: 2,
  ampMinBoostDays: 2,
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
} as const;

export const DEMO_PASTE_STAMP = "2026-09-22T15:00:00.000Z";
