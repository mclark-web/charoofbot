// One build check: posts.csv invariants, then corpus.json matches the CSVs.
// Next loads next.config twice in one `next build`. The second load skips when
// these inputs are unchanged.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, statSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { assertPosts } from "./check-posts.mjs";
import { buildCorpus } from "./build-corpus.mjs";

const INPUTS = [
  new URL("../data/gcbot/posts.csv", import.meta.url),
  new URL("../data/gcbot/accounts.csv", import.meta.url),
  new URL("../data/gcbot/narratives.csv", import.meta.url),
  new URL("../data/gcbot/reposters.csv", import.meta.url),
  new URL("../data/gcbot/post-overrides.csv", import.meta.url),
  new URL("../data/corpus.json", import.meta.url),
  new URL("../public/sitemap.xml", import.meta.url),
  new URL("./check-posts.mjs", import.meta.url),
  new URL("./build-corpus.mjs", import.meta.url),
  new URL("./write-sitemap.ts", import.meta.url),
  new URL("../lib/detect.ts", import.meta.url),
  new URL("../lib/sitemap-xml.ts", import.meta.url),
];
const stamp = "/tmp/charoofbot-check-build.stamp";

function fingerprint() {
  const hash = createHash("sha256");
  for (const file of INPUTS) {
    const stat = statSync(file);
    hash.update(file.pathname);
    hash.update(String(stat.mtimeMs));
    hash.update(String(stat.size));
  }
  return hash.digest("hex");
}

const token = fingerprint();
try {
  if (readFileSync(stamp, "utf8") === token) process.exit(0);
} catch {
  // No stamp yet, so run the check.
}

assertPosts();
const expected = `${JSON.stringify(buildCorpus(), null, 2)}\n`;
const actual = readFileSync(new URL("../data/corpus.json", import.meta.url), "utf8");
if (expected !== actual) {
  throw new Error("data/corpus.json does not match data/gcbot CSVs. Run npm run corpus.");
}
execFileSync(process.execPath, ["--import", "tsx", "scripts/write-sitemap.ts", "--check"], {
  stdio: "inherit",
  cwd: fileURLToPath(new URL("..", import.meta.url)),
});
writeFileSync(stamp, token);
console.log("check-build: posts.csv, corpus.json, and sitemap.xml ok");
