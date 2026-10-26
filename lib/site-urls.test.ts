import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  ANALYSTS_URL,
  FINTWIT_URL,
  HUB_URL,
  OG_IMAGE_URL,
  SITE_URL,
  SPORTS_URL,
  pageUrl,
  resolveSiteOrigin,
} from "./site-urls";

describe("site urls", () => {
  it("falls back to gradedcalls.com origins and strips a trailing slash", () => {
    assert.equal(resolveSiteOrigin(undefined, "https://bot.gradedcalls.com"), "https://bot.gradedcalls.com");
    assert.equal(resolveSiteOrigin("   ", "https://bot.gradedcalls.com"), "https://bot.gradedcalls.com");
    assert.equal(
      resolveSiteOrigin("https://bot.gradedcalls.com/", "https://example.invalid"),
      "https://bot.gradedcalls.com",
    );
    assert.equal(
      resolveSiteOrigin("https://preview.example/bot/", "https://bot.gradedcalls.com"),
      "https://preview.example/bot",
    );

    assert.equal(SITE_URL, resolveSiteOrigin(process.env.NEXT_PUBLIC_SITE_URL, "https://bot.gradedcalls.com"));
    assert.equal(HUB_URL, resolveSiteOrigin(process.env.NEXT_PUBLIC_HUB_URL, "https://www.gradedcalls.com"));
    assert.equal(
      ANALYSTS_URL,
      resolveSiteOrigin(process.env.NEXT_PUBLIC_ANALYSTS_URL, "https://analysts.gradedcalls.com"),
    );
    assert.equal(
      FINTWIT_URL,
      resolveSiteOrigin(process.env.NEXT_PUBLIC_FINTWIT_URL, "https://fintwit.gradedcalls.com"),
    );
    assert.equal(SPORTS_URL, `${HUB_URL}/sports`);
    assert.equal(pageUrl("/"), SITE_URL);
    assert.equal(pageUrl("/accounts"), `${SITE_URL}/accounts`);
    assert.equal(pageUrl("paste"), `${SITE_URL}/paste`);
    assert.equal(pageUrl("https://bot.gradedcalls.com/methodology/"), "https://bot.gradedcalls.com/methodology");
    assert.equal(OG_IMAGE_URL, `${SITE_URL}/opengraph-image.png`);
    assert.equal(existsSync(new URL("../public/opengraph-image.png", import.meta.url)), true);
    assert.equal(existsSync(new URL("../app/opengraph-image.png", import.meta.url)), false);
    assert.equal(existsSync(new URL("../app/opengraph-image.alt.txt", import.meta.url)), false);
  });

  it("keeps metadata, robots, sitemap, and the hub links on those origins", () => {
    const urls = readFileSync(new URL("./site-urls.ts", import.meta.url), "utf8");
    assert.match(urls, /NEXT_PUBLIC_SITE_URL/);
    assert.match(urls, /NEXT_PUBLIC_HUB_URL/);
    assert.match(urls, /NEXT_PUBLIC_ANALYSTS_URL/);
    assert.match(urls, /NEXT_PUBLIC_FINTWIT_URL/);
    assert.match(urls, /https:\/\/bot\.gradedcalls\.com/);
    assert.match(urls, /https:\/\/www\.gradedcalls\.com/);
    assert.match(urls, /https:\/\/analysts\.gradedcalls\.com/);
    assert.match(urls, /https:\/\/fintwit\.gradedcalls\.com/);

    const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
    assert.match(urls, /OG_IMAGE_URL/);
    assert.match(urls, /export function pageUrl/);
    assert.match(urls, /export function routeOpenGraph/);

    assert.match(urls, /export function routeCanonical/);
    assert.match(urls, /export function shareOpenGraph/);

    assert.match(layout, /import \{ SHARE_IMAGE, SITE_URL, shareOpenGraph \} from "@\/lib\/site-urls"/);
    assert.match(layout, /metadataBase: new URL\(SITE_URL\)/);
    assert.equal(layout.includes("canonical"), false);
    assert.match(layout, /openGraph: shareOpenGraph\(\)/);
    assert.match(layout, /images: \[SHARE_IMAGE\]/);

    for (const [file, path] of [
      ["../app/page.tsx", '"/"'],
      ["../app/accounts/page.tsx", '"/accounts"'],
      ["../app/paste/page.tsx", '"/paste"'],
      ["../app/methodology/page.tsx", '"/methodology"'],
    ] as const) {
      const source = readFileSync(new URL(file, import.meta.url), "utf8");
      assert.ok(source.includes(`routeCanonical(${path})`), `${file} canonical`);
      assert.ok(source.includes(`routeOpenGraph(${path})`), `${file} og:url`);
    }

    const account = readFileSync(new URL("../app/accounts/[handle]/page.tsx", import.meta.url), "utf8");
    assert.match(account, /const path = `\/accounts\/\$\{encodeURIComponent\(handle\)\}`/);
    assert.match(account, /alternates: routeCanonical\(path\)/);
    assert.match(account, /openGraph: routeOpenGraph\(path\)/);
    assert.match(account, /openGraph: shareOpenGraph\(\)/);

    const cluster = readFileSync(new URL("../app/clusters/[id]/page.tsx", import.meta.url), "utf8");
    assert.match(cluster, /const path = `\/clusters\/\$\{encodeURIComponent\(id\)\}`/);
    assert.match(cluster, /alternates: routeCanonical\(path\)/);
    assert.match(cluster, /openGraph: routeOpenGraph\(path\)/);

    const notFound = readFileSync(new URL("../app/not-found.tsx", import.meta.url), "utf8");
    assert.match(notFound, /openGraph: shareOpenGraph\(\)/);
    assert.equal(notFound.includes("canonical"), false);
    assert.equal(notFound.includes("routeOpenGraph"), false);
    assert.equal(notFound.includes("routeCanonical"), false);

    const nav = readFileSync(new URL("../components/site-nav.tsx", import.meta.url), "utf8");
    assert.match(nav, /SPORTS_URL/);
    assert.match(nav, /ANALYSTS_URL/);
    assert.match(nav, /FINTWIT_URL/);
    assert.match(nav, /label: "Sports"/);
    assert.match(nav, /label: "Analysts"/);
    assert.match(nav, /label: "FinTwit"/);

    const previewCheck = readFileSync(new URL("../scripts/check-preview-head.mjs", import.meta.url), "utf8");
    assert.match(previewCheck, /VERCEL_URL/);
    assert.match(previewCheck, /VERCEL_BRANCH_URL/);
    assert.match(previewCheck, /VERCEL_ENV/);
    assert.match(previewCheck, /_global-error\.html/);
    assert.match(previewCheck, /_not-found\.html/);

    const robots = readFileSync(new URL("../app/robots.ts", import.meta.url), "utf8");
    assert.match(robots, /sitemap: `\$\{SITE_URL\}\/sitemap\.xml`/);
    assert.match(robots, /host: SITE_URL/);

    const sitemap = readFileSync(new URL("./sitemap-xml.ts", import.meta.url), "utf8");
    assert.match(sitemap, /import \{ SITE_URL \} from "\.\/site-urls"/);
    assert.match(sitemap, /\$\{SITE_URL\}/);
  });
});
