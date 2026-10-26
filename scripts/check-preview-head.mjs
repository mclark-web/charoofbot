// Build as a Vercel preview and fail if any rendered HTML <head> names that deployment host.
// Next rewrites file-convention social images onto VERCEL_BRANCH_URL / VERCEL_URL when
// VERCEL_ENV=preview, even if metadataBase is the public origin. Absolute share URLs must not.
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const deploymentHost = ["vercel", "app"].join(".");
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

const hostPattern = new RegExp(deploymentHost.replace(".", "\\."), "i");
const hits = [];
for (const file of files) {
  const html = readFileSync(file, "utf8");
  const headEnd = html.toLowerCase().indexOf("</head>");
  if (headEnd === -1) continue;
  const head = html.slice(0, headEnd);
  if (hostPattern.test(head)) hits.push(file);
}

if (hits.length > 0) {
  console.error(`preview head check: ${deploymentHost} in ${hits.length} HTML head(s)`);
  for (const file of hits.slice(0, 20)) console.error(`  ${file}`);
  process.exit(1);
}

console.log(`preview head check: ${files.length} HTML files, no ${deploymentHost} in <head>`);
