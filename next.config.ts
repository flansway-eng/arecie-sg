import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.sharepoint.com",
      },
    ],
  },
};

export default nextConfig;
