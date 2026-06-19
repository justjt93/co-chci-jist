import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // TheMealDB serves meal photos from this CDN; we hotlink them.
    remotePatterns: [
      { protocol: "https", hostname: "www.themealdb.com" },
    ],
  },
};

export default nextConfig;
