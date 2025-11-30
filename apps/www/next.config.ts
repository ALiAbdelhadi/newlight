import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';
import withPWA from "@ducanh2912/next-pwa";

const nextConfig: NextConfig = {
  turbopack: {},
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  transpilePackages: ["@repo/database"],
  compiler: {
    styledComponents: true,
  },
    images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

const withNextIntl = createNextIntlPlugin();
let config = withNextIntl(nextConfig);

config = withPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  sw: "sw.js",
  fallbacks: {
    document: "/offline",
  },
})(config);

export default config;