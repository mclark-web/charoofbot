import { execFileSync } from "node:child_process";
import type { NextConfig } from "next";

// Vercel invokes `next build` directly, which skips npm prebuild.
execFileSync(process.execPath, ["scripts/check-posts.mjs"], { stdio: "inherit" });

const nextConfig: NextConfig = {
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
    ];
  },
};

export default nextConfig;
