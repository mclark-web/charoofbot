import type { MetadataRoute } from "next";
import corpusJson from "@/data/corpus.json";
import { analyzeCorpus } from "@/lib/detect";
import type { Corpus } from "@/lib/types";

const ORIGIN = "https://charoofbot.vercel.app";

// Static at build. A request-time read of the corpus 500s on the preview
// function (the JSON import is not in that bundle) while robots.txt, which
// imports nothing, stays 200.
export const dynamic = "force-static";
export const revalidate = false;

export default function sitemap(): MetadataRoute.Sitemap {
  const report = analyzeCorpus(corpusJson as Corpus);
  const staticRoutes = ["/", "/accounts", "/paste", "/methodology"].map((path) => ({
    url: `${ORIGIN}${path}`,
    changeFrequency: "weekly" as const,
    priority: path === "/" ? 1 : 0.7,
  }));
  const clusters = report.clusters.map((cluster) => ({
    url: `${ORIGIN}/clusters/${encodeURIComponent(cluster.id)}`,
    changeFrequency: "weekly" as const,
    priority: 0.5,
  }));
  const accounts = report.accounts.map((account) => ({
    url: `${ORIGIN}/accounts/${encodeURIComponent(account.handle)}`,
    changeFrequency: "weekly" as const,
    priority: 0.5,
  }));

  return [...staticRoutes, ...clusters, ...accounts];
}
