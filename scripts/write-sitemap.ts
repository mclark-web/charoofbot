import { readFileSync, writeFileSync } from "node:fs";
import { analyzeCorpus } from "../lib/detect";
import { sitemapXml } from "../lib/sitemap-xml";
import type { Corpus } from "../lib/types";

const corpus = JSON.parse(readFileSync(new URL("../data/corpus.json", import.meta.url), "utf8")) as Corpus;
const xml = sitemapXml(analyzeCorpus(corpus));
const target = new URL("../public/sitemap.xml", import.meta.url);

if (process.argv.includes("--check")) {
  const actual = readFileSync(target, "utf8");
  if (actual !== xml) {
    throw new Error("public/sitemap.xml is stale. Run npx tsx scripts/write-sitemap.ts");
  }
} else {
  writeFileSync(target, xml);
}
