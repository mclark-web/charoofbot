/**
 * Headline authenticity. Higher means more authentic.
 * Amplifier detection is not in the score until booster timelines exist, so this is 100 − copy score.
 */
export function gcScoreFrom(copyScore: number, amplifierScore = 0): number {
  // Booster timelines are not in this corpus, so the amplifier argument does not change the headline.
  void amplifierScore;
  if (!Number.isFinite(copyScore) || copyScore < 0) return 100;
  return 100 - Math.min(100, copyScore);
}
