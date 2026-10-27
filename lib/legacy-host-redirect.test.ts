import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import url from "node:url";
import nextConfig from "../next.config";
import { SITE_URL } from "./site-urls";
import {
  allowedRedirectLine,
  collectPublishableOutputs,
  deploymentHost,
  hostHitsInFiles,
  isAllowedSourceLine,
  publishableHostHits,
  sourceAllowlistViolations,
  textHasDeploymentHost,
} from "../scripts/vercel-app-guard.mjs";

const require = createRequire(import.meta.url);
const { getPathMatch } = require("next/dist/shared/lib/router/utils/path-match");
const { matchHas, prepareDestination } = require("next/dist/shared/lib/router/utils/prepare-destination");
const { getRedirectStatus, modifyRouteRegex } = require("next/dist/lib/redirect-status");
const { stringifyQuery } = require("next/dist/server/server-route-utils");
const { normalizeRepeatedSlashes } = require("next/dist/shared/lib/utils");

const legacyHost = `charoofbot.${deploymentHost}`;
const branchPreviewHost = `charoofbot-git-feature-hoonu.${deploymentHost}`;
const hashPreviewHost = `charoofbot-d34db33f-hoonu.${deploymentHost}`;
const root = fileURLToPath(new URL("..", import.meta.url));

type RedirectRule = {
  source: string;
  destination: string;
  permanent?: boolean;
  statusCode?: number;
  has?: { type: string; key?: string; value?: string }[];
  missing?: { type: string; key?: string; value?: string }[];
};

function compiledMatch(source: string) {
  return getPathMatch(source, {
    strict: true,
    removeUnnamedParams: true,
    regexModifier: (regex: string) => modifyRouteRegex(regex, ["/_next"]),
    sensitive: false,
  });
}

function applyRule(rule: RedirectRule, host: string, pathname: string, query: Record<string, string>) {
  const match = compiledMatch(rule.source);
  let params = match(pathname);
  if (!params) return null;
  if (rule.has || rule.missing) {
    const hasParams = matchHas({ headers: { host } }, query, rule.has, rule.missing);
    if (!hasParams) return null;
    params = { ...params, ...hasParams };
  }
  const prepared = prepareDestination({
    appendParamsToQuery: false,
    destination: rule.destination,
    params,
    query,
  });
  const parsedDestination = { ...prepared.parsedDestination };
  const destQuery = parsedDestination.query;
  delete parsedDestination.query;
  parsedDestination.search = stringifyQuery({ headers: {} }, destQuery);
  parsedDestination.pathname = normalizeRepeatedSlashes(parsedDestination.pathname);
  return {
    status: getRedirectStatus(rule) as number,
    location: url.format(parsedDestination),
  };
}

function firstRedirect(rules: RedirectRule[], host: string, pathname: string, query: Record<string, string>) {
  for (const rule of rules) {
    const applied = applyRule(rule, host, pathname, query);
    if (applied) return applied;
  }
  return null;
}

describe("legacy production host redirect", () => {
  it("308s only the old production host and keeps path and query", async () => {
    const redirects = nextConfig.redirects;
    if (!redirects) throw new Error("next.config redirects() is missing");
    const rules = (await redirects()) as RedirectRule[];
    assert.equal(rules.length, 2);

    assert.equal(rules[0].source, "/method");
    assert.equal(rules[0].destination, "/methodology");
    assert.equal(rules[0].permanent, true);
    assert.equal(rules[0].has, undefined);
    assert.equal(getRedirectStatus(rules[0]), 308);

    const rule = rules[1];
    assert.equal(rule.source, "/:path*");
    assert.equal(rule.permanent, true);
    assert.equal(rule.statusCode, undefined);
    assert.equal(getRedirectStatus(rule), 308);
    assert.deepEqual(rule.has, [{ type: "host", value: legacyHost }]);
    assert.equal(rule.destination, `${SITE_URL}/:path*`);
    assert.equal(new URL(SITE_URL).host === legacyHost, false);

    const account = firstRedirect(rules, legacyHost, "/accounts/foo", { x: "1", y: "2" });
    assert.ok(account);
    assert.equal(account.status, 308);
    const accountUrl = new URL(account.location);
    assert.equal(accountUrl.origin, SITE_URL);
    assert.equal(accountUrl.pathname, "/accounts/foo");
    assert.equal(accountUrl.search, "?x=1&y=2");
    assert.equal(accountUrl.host === legacyHost, false);

    const rootHit = firstRedirect(rules, legacyHost, "/", { a: "1" });
    assert.ok(rootHit);
    assert.equal(rootHit.status, 308);
    const rootUrl = new URL(rootHit.location);
    assert.equal(rootUrl.origin, SITE_URL);
    assert.equal(rootUrl.pathname, "/");
    assert.equal(rootUrl.search, "?a=1");

    assert.equal(firstRedirect(rules, branchPreviewHost, "/accounts/foo", { x: "1" }), null);
    assert.equal(firstRedirect(rules, hashPreviewHost, "/paste", {}), null);
    assert.equal(firstRedirect(rules, new URL(SITE_URL).host, "/accounts/foo", { x: "1" }), null);
    assert.equal(firstRedirect(rules, `foo.${legacyHost}`, "/accounts/foo", {}), null);

    const hopped = new URL(account.location);
    assert.equal(firstRedirect(rules, hopped.host, hopped.pathname, { x: "1", y: "2" }), null);

    const method = firstRedirect(rules, legacyHost, "/method", {});
    assert.ok(method);
    assert.equal(method.status, 308);
    assert.equal(method.location, "/methodology");
  });

  it("allowlists only the legacy redirect line and still flags built output", () => {
    const source = sourceAllowlistViolations(root);
    assert.equal(source.denied.length, 0);
    assert.equal(source.allowed.length, 1);
    assert.equal(source.allowed[0].file, "next.config.ts");
    assert.equal(source.allowed[0].content.trim(), allowedRedirectLine);
    assert.equal(isAllowedSourceLine("next.config.ts", allowedRedirectLine), true);
    assert.equal(isAllowedSourceLine("next.config.ts", `destination: "https://${legacyHost}/:path*",`), false);
    assert.equal(isAllowedSourceLine("README.md", allowedRedirectLine), false);
    assert.equal(isAllowedSourceLine("public/sitemap.xml", `https://${legacyHost}/accounts`), false);
    assert.equal(textHasDeploymentHost(allowedRedirectLine), true);
    assert.equal(textHasDeploymentHost("https://bot.gradedcalls.com/accounts"), false);

    const dir = mkdtempSync(join(tmpdir(), "legacy-host-redirect-"));
    mkdirSync(join(dir, ".next", "server", "app"), { recursive: true });
    mkdirSync(join(dir, ".next", "server", "chunks", "ssr"), { recursive: true });
    mkdirSync(join(dir, ".next", "static", "chunks"), { recursive: true });
    mkdirSync(join(dir, "public"), { recursive: true });
    const html = join(dir, ".next", "server", "app", "index.html");
    const pageData = join(dir, ".next", "server", "app", "index.rsc");
    const robots = join(dir, ".next", "server", "app", "robots.txt");
    const sitemap = join(dir, "public", "sitemap.xml");
    const manifest = join(dir, ".next", "routes-manifest.json");
    const requiredJson = join(dir, ".next", "required-server-files.json");
    const requiredJs = join(dir, ".next", "required-server-files.js");
    const clientJs = join(dir, ".next", "static", "chunks", "main.js");
    const clientCss = join(dir, ".next", "static", "chunks", "main.css");
    const serverChunk = join(dir, ".next", "server", "chunks", "ssr", "layout.js");
    const serverApp = join(dir, ".next", "server", "app", "page.js");
    const clean = "https://bot.gradedcalls.com/accounts";
    writeFileSync(html, "<html><head><title>GCBot</title></head></html>");
    writeFileSync(pageData, "page");
    writeFileSync(robots, `Host: ${SITE_URL}`);
    writeFileSync(sitemap, `<loc>${SITE_URL}/</loc>`);
    writeFileSync(clientJs, `window.open(${JSON.stringify(clean)})`);
    writeFileSync(clientCss, `.nav{color:#111}`);
    writeFileSync(serverChunk, `console.error(${JSON.stringify(clean)})`);
    writeFileSync(serverApp, "module.exports = {}");
    writeFileSync(manifest, allowedRedirectLine);
    writeFileSync(requiredJson, allowedRedirectLine);
    writeFileSync(requiredJs, allowedRedirectLine);
    assert.deepEqual(hostHitsInFiles([html, pageData, robots, sitemap, clientJs, clientCss, serverChunk, serverApp]), []);
    const outputs = collectPublishableOutputs(dir);
    for (const file of [html, pageData, robots, sitemap, clientJs, clientCss, serverChunk, serverApp]) {
      assert.ok(outputs.includes(file), file);
    }
    assert.equal(outputs.includes(manifest), false);
    assert.equal(outputs.includes(requiredJson), false);
    assert.equal(outputs.includes(requiredJs), false);
    assert.deepEqual(hostHitsInFiles(outputs), []);

    writeFileSync(html, `<a href="https://${legacyHost}/accounts">old</a>`);
    writeFileSync(pageData, legacyHost);
    writeFileSync(robots, `Host: https://${legacyHost}`);
    writeFileSync(sitemap, `<loc>https://${branchPreviewHost}/</loc>`);
    writeFileSync(clientJs, `window.open("https://${legacyHost}")`);
    writeFileSync(clientCss, `.nav{background:url(https://${legacyHost}/a)}`);
    writeFileSync(serverChunk, `console.error("https://${legacyHost}")`);
    writeFileSync(serverApp, `const host = "https://${legacyHost}";`);
    const leaks = hostHitsInFiles([html, pageData, robots, sitemap, clientJs, clientCss, serverChunk, serverApp]);
    assert.equal(leaks.length, 8);
    assert.equal(hostHitsInFiles(outputs).length, 8);
    assert.equal(outputs.includes(manifest), false);
    assert.equal(outputs.includes(requiredJson), false);
    assert.equal(outputs.includes(requiredJs), false);
  });

  it("fails the guard when a split host literal is bundled, then the sources stay clean", { timeout: 600_000 }, () => {
    const dir = mkdtempSync(join(tmpdir(), "legacy-host-mutation-"));
    try {
      cpSync(root, dir, {
        recursive: true,
        force: true,
        filter: (src) => {
          const name = relative(root, src).replaceAll("\\", "/");
          return !(
            name === "node_modules" ||
            name.startsWith("node_modules/") ||
            name === ".next" ||
            name.startsWith(".next/") ||
            name === ".git" ||
            name.startsWith(".git/")
          );
        },
      });
      const modules = spawnSync("cp", ["-al", join(root, "node_modules"), join(dir, "node_modules")], {
        encoding: "utf8",
      });
      assert.equal(modules.status, 0, modules.stderr);
      const splitHost = `"https://x.vercel" + ".app"`;
      const navPath = join(dir, "components", "site-nav.tsx");
      const layoutPath = join(dir, "app", "layout.tsx");
      const nav = readFileSync(navPath, "utf8");
      const layout = readFileSync(layoutPath, "utf8");
      assert.equal(nav.includes(splitHost), false);
      assert.equal(layout.includes(splitHost), false);
      writeFileSync(
        navPath,
        nav.replace(
          'aria-label="Primary"',
          `aria-label="Primary"\n      onClick={() => {\n        window.open(${splitHost});\n      }}`,
        ),
      );
      writeFileSync(layoutPath, layout.replace('import "./globals.css";', `import "./globals.css";\nconsole.error(${splitHost});\n`));
      assert.equal(readFileSync(navPath, "utf8").includes(splitHost), true);
      assert.equal(readFileSync(layoutPath, "utf8").includes(splitHost), true);
      assert.equal(textHasDeploymentHost(readFileSync(navPath, "utf8")), false);
      assert.equal(textHasDeploymentHost(readFileSync(layoutPath, "utf8")), false);

      const build = spawnSync(process.execPath, [join(dir, "node_modules/next/dist/bin/next"), "build"], {
        cwd: dir,
        env: { ...process.env },
        stdio: "inherit",
      });
      assert.equal(build.status, 0);
      const hits = publishableHostHits(dir).map((file: string) => relative(dir, file).replaceAll("\\", "/"));
      assert.ok(hits.some((file: string) => file.startsWith(".next/static/") && file.endsWith(".js")), hits.join("\n"));
      assert.ok(
        hits.some(
          (file: string) =>
            (file.startsWith(".next/server/chunks/") && file.endsWith(".js")) ||
            (file.startsWith(".next/server/app/") && file.endsWith(".js")),
        ),
        hits.join("\n"),
      );
      assert.equal(hits.includes(".next/routes-manifest.json"), false);
      assert.equal(hits.includes(".next/required-server-files.json"), false);
      assert.equal(hits.includes(".next/required-server-files.js"), false);
      const source = sourceAllowlistViolations(dir);
      assert.equal(source.denied.length, 0);
      assert.equal(source.allowed.length, 1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }

    const splitHost = `"https://x.vercel" + ".app"`;
    assert.equal(readFileSync(join(root, "components", "site-nav.tsx"), "utf8").includes(splitHost), false);
    assert.equal(readFileSync(join(root, "app", "layout.tsx"), "utf8").includes(splitHost), false);
  });
});
