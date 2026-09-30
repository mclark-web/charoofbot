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
  });
});