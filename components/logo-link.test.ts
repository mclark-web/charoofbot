import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("logo link", () => {
  it("points at the GradedCalls hub in the same tab", () => {
    const source = readFileSync(new URL("./logo-link.tsx", import.meta.url), "utf8");
    assert.match(source, /export const HUB_HREF = "https:\/\/charoof\.vercel\.app"/);
    assert.match(source, /href=\{HUB_HREF\}/);
    assert.match(source, /aria-label="GradedCalls"/);
    assert.match(source, /alt="GradedCalls"/);
    assert.equal(source.includes("target="), false);

    const header = readFileSync(new URL("./site-header.tsx", import.meta.url), "utf8");
    assert.match(header, /<LogoLink\s*\/>/);
    assert.equal(header.includes('aria-label="GradedCalls home"'), false);

    const errorPage = readFileSync(new URL("../app/error.tsx", import.meta.url), "utf8");
    assert.match(errorPage, /<LogoLink\s*\/>/);
    assert.match(errorPage, /reset\(\)/);
    assert.equal(errorPage.includes("retry"), false);

    const globalError = readFileSync(new URL("../app/global-error.tsx", import.meta.url), "utf8");
    assert.match(globalError, /<LogoLink\s+embedded\s*\/>/);
    assert.match(globalError, /<title>This page failed to render · GCBot<\/title>/);
    assert.match(globalError, /href="https:\/\/charoof\.vercel\.app"/);
    assert.match(globalError, />\s*Hub\s*</);

    assert.match(source, /\/gradedcalls-mark-44\.png/);
    assert.match(source, /\/gradedcalls-mark-88\.png/);
    assert.match(source, /width=\{44\}/);
    assert.match(source, /#eb6505/);
    assert.equal(source.includes("next/image"), false);
    assert.equal(source.includes("#ee9a44"), false);

    const css = readFileSync(new URL("./logo-link.module.css", import.meta.url), "utf8");
    assert.match(css, /width:\s*44px/);
    assert.match(css, /height:\s*44px/);
    assert.match(css, /#eb6505/);
    assert.equal(css.includes("#ee9a44"), false);
    assert.equal(css.includes("32px"), false);

    const notFound = readFileSync(new URL("../app/not-found.tsx", import.meta.url), "utf8");
    assert.match(notFound, /Page not found · GCBot/);
    assert.match(notFound, /href=\{HUB_HREF\}/);
    assert.match(notFound, />\s*Back to the Hub\s*</);
    assert.match(notFound, /mt-6 text-ink-soft/);

    const diff = readFileSync(new URL("./diff-view.tsx", import.meta.url), "utf8");
    assert.match(diff, /underline/);
    assert.match(diff, /text-vermilion/);
  });
});