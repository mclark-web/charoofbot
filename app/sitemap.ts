import type { MetadataRoute } from "next";
import { getReport } from "@/lib/corpus";

const BASE = "https://charoofbot.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const report = getReport();
  const paths = [
    "/",
    "/paste",
    "/methodology",
    ...report.accounts.map((account) => `/accounts/${account.handle}`),
    ...report.clusters.map((cluster) => `/clusters/${cluster.id}`),
  ];
  return paths.map((path) => ({ url: path === "/" ? `${BASE}/` : `${BASE}${path}` }));
}
