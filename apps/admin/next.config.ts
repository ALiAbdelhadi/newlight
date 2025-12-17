import type { NextConfig } from "next";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
});

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true
  },
  reactStrictMode: true,
  transpilePackages: ["@repo/database"],
  compress: true,
  poweredByHeader: false,
};

export default withPWA(nextConfig);