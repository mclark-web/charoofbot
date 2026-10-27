// Build as a Vercel preview and fail if any rendered HTML <head> names that deployment host.
// Next rewrites file-convention social images onto VERCEL_BRANCH_URL / VERCEL_URL when
// VERCEL_ENV=preview, even if metadataBase is the public origin. Absolute share URLs must not.
// The same host is also forbidden in built HTML, page data, robots, sitemap,
// client bundles (.next/static js and css), server chunks, and server app JS.
// Source may name it only on the legacy production redirect line in next.config.ts.
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  deploymentHost,
  publishableHostHits,
  sourceAllowlistViolations,
  textHasDeploymentHost,
} from "./vercel-app-guard.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const previewHost = `charoofbot-preview.${deploymentHost}`;
const branchHost = `charoofbot-git-preview.${deploymentHost}`;
const productionHost = `charoofbot.${deploymentHost}`;

const env = { ...process.env };
delete env.NEXT_PUBLIC_SITE_URL;
delete env.NEXT_PUBLIC_HUB_URL;
delete env.NEXT_PUBLIC_ANALYSTS_URL;
delete env.NEXT_PUBLIC_FINTWIT_URL;
env.VERCEL = "1";
env.VERCEL_ENV = "preview";
env.VERCEL_URL = previewHost;
env.VERCEL_BRANCH_URL = branchHost;
env.VERCEL_PROJECT_PRODUCTION_URL = productionHost;

const source = sourceAllowlistViolations(root);
if (source.denied.length > 0 || source.allowed.length !== 1) {
  console.error(
    `preview head check: ${deploymentHost} is only allowed on the legacy production redirect line in next.config.ts`,
  );
  for (const hit of source.denied.slice(0, 20)) console.error(`  ${hit.file}:${hit.line}:${hit.content}`);
  if (source.allowed.length !== 1) {
    console.error(`  expected 1 allowlisted redirect line, found ${source.allowed.length}`);
  }
  process.exit(1);
}

const build = spawnSync(process.execPath, [join(root, "node_modules/next/dist/bin/next"), "build"], {
  cwd: root,
  env,
  stdio: "inherit",
});
if (build.status !== 0) process.exit(build.status ?? 1);

function htmlFiles(dir, found = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) htmlFiles(path, found);
    else if (name.endsWith(".html")) found.push(path);
  }
  return found;
}

const nextDir = join(root, ".next");
const files = htmlFiles(nextDir);
if (files.length === 0) {
  console.error("preview head check: no HTML files under .next");
  process.exit(1);
}

const appDir = join(nextDir, "server", "app");
const origin = "https://bot.gradedcalls.com";
const shareImage = `${origin}/opengraph-image.png`;
const hits = [];
const canonicalMisses = [];
let pages = 0;

function routeFromHtml(file) {
  const rel = file.slice(appDir.length + 1).replaceAll("\\", "/");
  if (rel === "_not-found.html" || rel.endsWith("/_not-found.html")) return null;
  // Next's own error shell. It does not run the metadata API, so it must not
  // publish a canonical or og:url, and it has no share image.
  if (rel === "_global-error.html" || rel.endsWith("/_global-error.html")) return "shell";
  let route = rel.replace(/\.html$/, "");
  if (route === "index") return "/";
  if (route.endsWith("/index")) route = route.slice(0, -"/index".length);
  route = route
    .split("/")
    .map((part) => decodeURIComponent(part))
    .join("/");
  return route.startsWith("/") ? route : `/${route}`;
}

function pagePath(value) {
  const url = new URL(value);
  const path = decodeURI(url.pathname).replace(/\/$/, "") || "/";
  return { origin: url.origin, path };
}

function tagValue(head, pattern) {
  const tag = head.match(pattern);
  if (!tag) return null;
  const href = tag[0].match(/href="([^"]*)"/);
  const content = tag[0].match(/content="([^"]*)"/);
  return (href && href[1]) || (content && content[1]) || null;
}

for (const file of files) {
  if (!file.startsWith(appDir)) continue;
  const html = readFileSync(file, "utf8");
  const headEnd = html.toLowerCase().indexOf("</head>");
  if (headEnd === -1) continue;
  const head = html.slice(0, headEnd);
  pages += 1;
  if (textHasDeploymentHost(head)) hits.push(file);

  const route = routeFromHtml(file);
  const canonical = tagValue(head, /<link\b[^>]*rel="canonical"[^>]*>/i);
  const ogUrl = tagValue(head, /<meta\b[^>]*property="og:url"[^>]*>/i);
  const ogImage = tagValue(head, /<meta\b[^>]*property="og:image"[^>]*>/i);
  const twitterImage = tagValue(head, /<meta\b[^>]*name="twitter:image"[^>]*>/i);
  const imageOk = ogImage === shareImage && twitterImage === shareImage;

  if (route === "shell") {
    if (canonical || ogUrl) canonicalMisses.push(`${file} error shell canonical=${canonical} og:url=${ogUrl}`);
    continue;
  }

  if (route === null) {
    if (canonical || ogUrl || !imageOk) canonicalMisses.push(`${file} 404 canonical=${canonical} og:url=${ogUrl} image=${ogImage}`);
    continue;
  }

  const expected = route === "/" ? origin : `${origin}${route}`;
  let canonicalOk = false;
  let ogOk = false;
  try {
    const canonicalPage = pagePath(canonical);
    const ogPage = pagePath(ogUrl);
    canonicalOk = canonicalPage.origin === origin && canonicalPage.path === route;
    ogOk = ogPage.origin === origin && ogPage.path === route;
  } catch {
    canonicalOk = false;
    ogOk = false;
  }
  if (!canonicalOk || !ogOk || !imageOk || canonical !== expected || ogUrl !== expected) {
    canonicalMisses.push(`${file} expected ${expected} canonical=${canonical} og:url=${ogUrl} image=${ogImage}`);
  }
}

if (hits.length > 0) {
  console.error(`preview head check: ${deploymentHost} in ${hits.length} HTML head(s)`);
  for (const file of hits.slice(0, 20)) console.error(`  ${file}`);
  process.exit(1);
}

if (pages === 0) {
  console.error("preview head check: no app HTML heads");
  process.exit(1);
}

if (canonicalMisses.length > 0) {
  console.error(`preview head check: ${canonicalMisses.length} page(s) with the wrong canonical, og:url, or share image`);
  for (const line of canonicalMisses.slice(0, 20)) console.error(`  ${line}`);
  process.exit(1);
}

const builtHits = publishableHostHits(root);
if (builtHits.length > 0) {
  console.error(
    `preview head check: ${deploymentHost} in ${builtHits.length} built HTML, page data, robots, sitemap, or script file(s)`,
  );
  for (const file of builtHits.slice(0, 20)) console.error(`  ${file}`);
  process.exit(1);
}

console.log(`preview head check: ${pages} HTML heads, no ${deploymentHost}, canonical and og:url match each page`);
