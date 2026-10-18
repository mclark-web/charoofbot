/** Headline authenticity. Higher means more authentic. */
export function gcScoreFrom(copyScore: number, amplifierScore: number): number {
  const worse = Math.max(copyScore, amplifierScore);
  if (!Number.isFinite(worse) || worse < 0) return 100;
  return 100 - Math.min(100, worse);
}
