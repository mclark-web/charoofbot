import type { AccountReport } from "./types";
import { compareText } from "./order";
import { THRESHOLDS } from "./thresholds";

/**
 * Most original (highest GC score) and biggest copycats (lowest GC score).
 * The lanes do not share accounts. A STRONG score is never listed as a copycat
 * when any eligible account scores lower. A single eligible account is only most original.
 */
/** Posts that are this account's own wording, not a copy and not a credited repost. */
export function hasOriginalPost(account: AccountReport): boolean {
  if (account.clonePostCount === undefined && account.attributedPostCount === undefined) return true;
  const copied = account.clonePostCount ?? 0;
  const credited = (account.attributedPostCount ?? 0) + (account.syndicatedPostCount ?? 0);
  return account.postCount - copied - credited > 0;
}

export function splitBoard(
  accounts: AccountReport[],
  minPosts = THRESHOLDS.leaderboardMinPosts,
  limit = 8,
): { best: AccountReport[]; worst: AccountReport[] } {
  const eligible = [...accounts]
    .filter((account) => account.postCount >= minPosts)
    .sort((a, b) => b.gcScore - a.gcScore || compareText(a.handle, b.handle));
  if (eligible.length === 0) return { best: [], worst: [] };
  if (eligible.length === 1) return { best: eligible, worst: [] };

  const strong = eligible.filter((account) => account.gcScore >= 70 && hasOriginalPost(account));
  if (strong.length === 0) {
    const slots = Math.min(limit, Math.floor(eligible.length / 2));
    return {
      best: eligible.slice(0, slots),
      worst: eligible.slice(-slots).reverse(),
    };
  }

  const worst = eligible
    .filter((account) => account.gcScore < 70)
    .sort((a, b) => a.gcScore - b.gcScore || compareText(a.handle, b.handle))
    .slice(0, limit);
  return {
    best: strong.slice(0, limit),
    worst,
  };
}
