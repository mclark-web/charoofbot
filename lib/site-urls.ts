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

/** Share image served from public/, not the opengraph-image file convention. */
export const OG_IMAGE_URL = `${SITE_URL}/opengraph-image.png`;

export const SHARE_IMAGE = {
  url: OG_IMAGE_URL,
  width: 1200,
  height: 630,
  alt: "GradedCalls",
} as const;

/** Absolute URL on this board. `pageUrl("/")` is SITE_URL with no trailing slash. */
export function pageUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path.replace(/\/+$/, "");
  const suffix = path.startsWith("/") ? path : `/${path}`;
  if (suffix === "/") return SITE_URL;
  return `${SITE_URL}${suffix}`;
}

/** Open Graph fields for one route. Absolute url and image so preview hosts are not substituted. */
export function routeOpenGraph(path: string) {
  return {
    url: pageUrl(path),
    title: { absolute: "GCBot · GradedCalls" },
    siteName: "GradedCalls",
    type: "website" as const,
    images: [SHARE_IMAGE],
  };
}
