import type { Report } from "./types";

const ORIGIN = "https://charoofbot.vercel.app";

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

/** Static sitemap body. Served from public/sitemap.xml so the route is not a function. */
export function sitemapXml(report: Report): string {
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
