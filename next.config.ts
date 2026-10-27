import { execFileSync } from "node:child_process";
import type { NextConfig } from "next";
import { SITE_URL } from "./lib/site-urls";

// Vercel invokes `next build` directly, which skips npm prebuild.
execFileSync(process.execPath, ["scripts/check-build.mjs"], { stdio: "inherit" });

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Content-Security-Policy-Report-Only",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com https://vercel.live; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
          },
        ],
      },
    ];
  },
  images: {
    qualities: [75, 90],
  },
  async redirects() {
    return [
      {
        source: "/method",
        destination: "/methodology",
        permanent: true,
      },
      // Old production alias only. Branch and hash preview hosts stay on this deployment.
      {
        source: "/:path*",
        has: [{ type: "host", value: "charoofbot.vercel.app" }],
        destination: `${SITE_URL}/:path*`,
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
