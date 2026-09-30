import type { MetadataRoute } from "next";
import { getReport } from "@/lib/corpus";

const ORIGIN = "https://charoofbot.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const report = getReport();
  const staticRoutes = ["/", "/paste", "/methodology"].map((path) => ({
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
