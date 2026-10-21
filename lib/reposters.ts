import { resolveAge } from "./age";
import { THRESHOLDS } from "./thresholds";
import type { Reposter, ReposterSample } from "./types";

/**
 * New-account reposters, aged on the created calendar date against the same
 * clock as poster ages. Narratives with no sampled rows are absent.
 */
export function reposterSamples(rows: Reposter[], asOf: string): Map<string, ReposterSample> {
  const groups = new Map<string, Reposter[]>();
  for (const row of rows) {
    const list = groups.get(row.narrativeId);
    if (list) list.push(row);
    else groups.set(row.narrativeId, [row]);
  }

  const samples = new Map<string, ReposterSample>();
  for (const [narrativeId, list] of groups) {
    let under1y = 0;
    let under30d = 0;
    for (const row of list) {
      const age = resolveAge({ accountCreatedAt: row.accountCreatedAt.slice(0, 10) }, asOf);
      if (age.ageDays === null) continue;
      if (age.ageDays < THRESHOLDS.youngAccountDays) under1y += 1;
      if (age.ageDays < THRESHOLDS.freshAccountDays) under30d += 1;
    }
    samples.set(narrativeId, { reposters: list.length, under1y, under30d });
  }
  return samples;
}

/** Whole percent of the sample under 1 year. Zero reposters is 0. */
export function newAccountReposterPct(sample: ReposterSample): number {
  if (sample.reposters === 0) return 0;
  return Math.round((100 * sample.under1y) / sample.reposters);
}
