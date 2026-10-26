/** Absolute origin with no trailing slash. An empty value uses the fallback. */
export function resolveSiteOrigin(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim().replace(/\/+$/, "") ?? "";
  return trimmed.length > 0 ? trimmed : fallback;
}

/** This board. Override with NEXT_PUBLIC_SITE_URL. */
export const SITE_URL = resolveSiteOrigin(
  process.env.NEXT_PUBLIC_SITE_URL,
  "https://bot.gradedcalls.com",
);

/** Hub. Override with NEXT_PUBLIC_HUB_URL. Sports is `${HUB_URL}/sports`. */
export const HUB_URL = resolveSiteOrigin(
  process.env.NEXT_PUBLIC_HUB_URL,
  "https://www.gradedcalls.com",
);

/** Analysts board. Override with NEXT_PUBLIC_ANALYSTS_URL. */
export const ANALYSTS_URL = resolveSiteOrigin(
  process.env.NEXT_PUBLIC_ANALYSTS_URL,
  "https://analysts.gradedcalls.com",
);

/** FinTwit board. Override with NEXT_PUBLIC_FINTWIT_URL. */
export const FINTWIT_URL = resolveSiteOrigin(
  process.env.NEXT_PUBLIC_FINTWIT_URL,
  "https://fintwit.gradedcalls.com",
);

export const SPORTS_URL = `${HUB_URL}/sports`;
