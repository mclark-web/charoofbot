import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  ANALYSTS_URL,
  FINTWIT_URL,
  HUB_URL,
  SITE_URL,
  SPORTS_URL,
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
    assert.match(layout, /import \{ SITE_URL \} from "@\/lib\/site-urls"/);
    assert.match(layout, /metadataBase: new URL\(SITE_URL\)/);
    assert.match(layout, /canonical: "\/"/);
    assert.match(layout, /url: "\/",/);

    const robots = readFileSync(new URL("../app/robots.ts", import.meta.url), "utf8");
    assert.match(robots, /sitemap: `\$\{SITE_URL\}\/sitemap\.xml`/);
    assert.match(robots, /host: SITE_URL/);

    const sitemap = readFileSync(new URL("./sitemap-xml.ts", import.meta.url), "utf8");
    assert.match(sitemap, /import \{ SITE_URL \} from "\.\/site-urls"/);
    assert.match(sitemap, /\$\{SITE_URL\}/);
  });
});
