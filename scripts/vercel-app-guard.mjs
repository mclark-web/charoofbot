// The deployment host string is built here so this file is not an occurrence of it.
// The only allowed source occurrence is the legacy production redirect in next.config.ts.
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

export const deploymentHost = ["vercel", "app"].join(".");

export const allowedRedirectLine = `has: [{ type: "host", value: "charoofbot.${deploymentHost}" }],`;

const hostPattern = new RegExp(deploymentHost.replace(".", "\\."), "i");

export function textHasDeploymentHost(text) {
  return hostPattern.test(text);
}

export function isAllowedSourceLine(file, content) {
  const normalized = file.replaceAll("\\", "/").replace(/^\.\//, "");
  return normalized === "next.config.ts" && content.trim() === allowedRedirectLine;
}

function parseRgLine(line) {
  const match = line.match(/^(.*?):(\d+):(.*)$/);
  if (!match) throw new Error(`unexpected rg line: ${line}`);
  const file = match[1].replaceAll("\\", "/").replace(/^\.\//, "");
  return { file, line: Number(match[2]), content: match[3] };
}

export function listSourceHits(root) {
  const result = spawnSync(
    "rg",
    ["-n", "-F", "-i", "--glob", "!.git/**", "--glob", "!node_modules/**", "--glob", "!.next/**", deploymentHost, "."],
    { cwd: root, encoding: "utf8" },
  );
  if (result.error) throw result.error;
  if (result.status === 1) return [];
  if (result.status !== 0) {
    throw new Error(result.stderr || `rg exited ${result.status}`);
  }
  return result.stdout.split("\n").filter(Boolean).map(parseRgLine);
}

export function sourceAllowlistViolations(root) {
  const hits = listSourceHits(root);
  const allowed = hits.filter((hit) => isAllowedSourceLine(hit.file, hit.content));
  const denied = hits.filter((hit) => !isAllowedSourceLine(hit.file, hit.content));
  return { hits, allowed, denied };
}

function walk(dir, accept, found) {
  if (!existsSync(dir)) return found;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, accept, found);
    else if (accept(path)) found.push(path);
  }
  return found;
}

/** Built HTML, RSC page data, robots, and sitemap. Not routes manifests. */
export function collectPublishableOutputs(root) {
  const files = walk(join(root, ".next", "server"), (path) => {
    const rel = relative(root, path).replaceAll("\\", "/");
    if (rel.endsWith(".html") || rel.endsWith(".rsc")) return true;
    if (rel.includes("/robots")) return true;
    if (rel.endsWith("sitemap.xml")) return true;
    return false;
  }, []);
  const publicSitemap = join(root, "public", "sitemap.xml");
  if (existsSync(publicSitemap)) files.push(publicSitemap);
  return files;
}

export function hostHitsInFiles(files) {
  return files.filter((file) => textHasDeploymentHost(readFileSync(file, "utf8")));
}

export function publishableHostHits(root) {
  return hostHitsInFiles(collectPublishableOutputs(root));
}
