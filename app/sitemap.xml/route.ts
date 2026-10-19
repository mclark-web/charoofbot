import corpusJson from "@/data/corpus.json";
import { analyzeCorpus } from "@/lib/detect";
import type { Corpus } from "@/lib/types";

const ORIGIN = "https://charoofbot.vercel.app";

// A metadata sitemap threw on the preview. This route returns one XML string
// built from the static corpus import and prerendered with the build.
export const dynamic = "force-static";
export const revalidate = false;

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function loc(path: string, priority: string): string {
  const url = escapeXml(`${ORIGIN}${path}`);
  return `<url>\n<loc>${url}</loc>\n<changefreq>weekly</changefreq>\n<priority>${priority}</priority>\n</url>`;
}

function sitemapXml(): string {
  const report = analyzeCorpus(corpusJson as Corpus);
  const urls = [
    loc("/", "1"),
    loc("/accounts", "0.7"),
    loc("/paste", "0.7"),
    loc("/methodology", "0.7"),
    ...report.clusters.map((cluster) => loc(`/clusters/${encodeURIComponent(cluster.id)}`, "0.5")),
    ...report.accounts.map((account) => loc(`/accounts/${encodeURIComponent(account.handle)}`, "0.5")),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
}

const body = sitemapXml();

export function GET(): Response {
  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}
