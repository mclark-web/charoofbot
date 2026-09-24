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
  /** Account age under this many days is fresh (the stricter new-account band). */
  freshAccountDays: 30,
  /** Account age under this many days is still new. Fresh accounts are included. */
  youngAccountDays: 365,
  /**
   * Share of posts from accounts under 1 year at which a cluster or narrative
   * is marked as dominated by new accounts. The fresh band uses the same share.
   */
  newAccountDominateShare: 0.5,
} as const;

export const DEMO_PASTE_STAMP = "2026-09-22T15:00:00.000Z";

/** Same predicate detect.ts uses for the amplifier label. Display must not invent a second gate. */
export function passesAmplifierGate(ampScore: number, boostPostCount: number, boostDays: number): boolean {
  return (
    ampScore >= THRESHOLDS.ampLabel &&
    boostPostCount >= THRESHOLDS.ampMinBoostPosts &&
    boostDays >= THRESHOLDS.ampMinBoostDays
  );
}

/** Withheld-gate explanation. Numbers come from the same thresholds the detector uses. */
export const ORGANIC_REACH_RULE = `Organic reach is graded only when the amplifier signal is ${THRESHOLDS.ampLabel} or higher with at least ${THRESHOLDS.ampMinBoostPosts} boosts on ${THRESHOLDS.ampMinBoostDays} different days; otherwise it reads Not graded yet.`;

/** Facts for this account, then which part of the gate failed, then the rule. */
export function organicReachWithheldDetail(boostPostCount: number, boostDays: number, ampScore: number): string {
  const missed: string[] = [];
  if (!(ampScore >= THRESHOLDS.ampLabel)) {
    missed.push(`amplifier signal ${ampScore} is under ${THRESHOLDS.ampLabel}`);
  }
  if (boostPostCount < THRESHOLDS.ampMinBoostPosts) {
    missed.push(
      `${boostPostCount} boost${boostPostCount === 1 ? "" : "s"} is under ${THRESHOLDS.ampMinBoostPosts}`,
    );
  }
  if (boostDays < THRESHOLDS.ampMinBoostDays) {
    missed.push(
      `${boostDays} day${boostDays === 1 ? "" : "s"} is under ${THRESHOLDS.ampMinBoostDays} different days`,
    );
  }
  const facts = `${boostPostCount} boost${boostPostCount === 1 ? "" : "s"} across ${boostDays} day${boostDays === 1 ? "" : "s"}, amplifier signal ${ampScore}%.`;
  const which = missed.length > 0 ? ` Failed: ${missed.join("; ")}.` : "";
  return `${facts}${which} ${ORGANIC_REACH_RULE}`;
}

/** Fixture and paste ages are measured against this stamp, not the wall clock and not the X API. */
export const AGE_AS_OF = DEMO_PASTE_STAMP;
