import type { NextConfig } from "next";

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
