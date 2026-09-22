import { AGE_AS_OF, THRESHOLDS } from "./thresholds";
import type { AgeBand, AgeVolume, FixtureAccount, FixturePost } from "./types";

export type AgeInput = {
  accountCreatedAt?: string | null;
  joined?: string | null;
  ageDays?: number | null;
};

export type ResolvedAge = {
  accountCreatedAt: string | null;
  ageDays: number | null;
  ageBand: AgeBand;
};

const DAY_MS = 86_400_000;

export function parseCreatedAt(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? `${trimmed}T00:00:00.000Z` : trimmed;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : ms;
}

export function bandForAgeDays(days: number | null): AgeBand {
  if (days === null) return "unknown";
  if (days < THRESHOLDS.freshAccountDays) return "fresh";
  if (days < THRESHOLDS.youngAccountDays) return "young";
  return "established";
}

function fromDays(ageDays: number, asOfMs: number): ResolvedAge {
  const days = Math.floor(ageDays);
  return {
    accountCreatedAt: new Date(asOfMs - days * DAY_MS).toISOString(),
    ageDays: days,
    ageBand: bandForAgeDays(days),
  };
}

/** Resolve a poster age against the fixture clock. Missing input stays unknown. */
export function resolveAge(input: AgeInput, asOf = AGE_AS_OF): ResolvedAge {
  const asOfMs = Date.parse(asOf);
  if (Number.isNaN(asOfMs)) return { accountCreatedAt: null, ageDays: null, ageBand: "unknown" };

  const createdRaw = (input.accountCreatedAt || input.joined || "").trim();
  const createdMs = createdRaw ? parseCreatedAt(createdRaw) : null;
  if (createdMs !== null) {
    const ageDays = Math.floor((asOfMs - createdMs) / DAY_MS);
    const days = ageDays < 0 ? 0 : ageDays;
    return {
      accountCreatedAt: new Date(createdMs).toISOString(),
      ageDays: days,
      ageBand: bandForAgeDays(days),
    };
  }

  if (typeof input.ageDays === "number" && Number.isFinite(input.ageDays) && input.ageDays >= 0) {
    return fromDays(input.ageDays, asOfMs);
  }

  return { accountCreatedAt: null, ageDays: null, ageBand: "unknown" };
}

/**
 * Fixture directory wins. Paste-only posters use the optional created date or ageDays on the post.
 */
export function ageOfPoster(
  post: FixturePost,
  directory: Map<string, FixtureAccount>,
  asOf = AGE_AS_OF,
): ResolvedAge {
  const known = directory.get(post.account);
  if (known) {
    return resolveAge({ accountCreatedAt: known.accountCreatedAt, joined: known.joined }, asOf);
  }
  return resolveAge({ accountCreatedAt: post.accountCreatedAt, ageDays: post.ageDays }, asOf);
}

export function summarizeAges(bands: AgeBand[]): AgeVolume {
  let freshPostCount = 0;
  let youngPostCount = 0;
  let establishedPostCount = 0;
  let unknownAgePostCount = 0;
  for (const band of bands) {
    if (band === "fresh") freshPostCount += 1;
    else if (band === "young") youngPostCount += 1;
    else if (band === "established") establishedPostCount += 1;
    else unknownAgePostCount += 1;
  }
  const total = bands.length;
  const underYearPostCount = freshPostCount + youngPostCount;
  const freshShare = total === 0 ? 0 : freshPostCount / total;
  const underYearShare = total === 0 ? 0 : underYearPostCount / total;
  return {
    freshPostCount,
    youngPostCount,
    underYearPostCount,
    establishedPostCount,
    unknownAgePostCount,
    freshVolumePct: total === 0 ? 0 : Math.round(freshShare * 100),
    underYearVolumePct: total === 0 ? 0 : Math.round(underYearShare * 100),
    freshAccountsDominate: total > 0 && freshShare >= THRESHOLDS.newAccountDominateShare,
    newAccountsDominate: total > 0 && underYearShare >= THRESHOLDS.newAccountDominateShare,
  };
}
