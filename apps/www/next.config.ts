import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';
import withPWA from "@ducanh2912/next-pwa";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@repo/database"],
  compiler: {
    styledComponents: true,
  },
  compress: true,
  poweredByHeader: false,
  webpack: (config, { isServer }) => {
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
    };
    if (!config.resolve.extensions) {
      config.resolve.extensions = [];
    }
    config.resolve.extensions = [
      '.ts',
      '.tsx',
      '.js',
      '.jsx',
      ...config.resolve.extensions.filter((ext: string) =>
        !['.ts', '.tsx', '.js', '.jsx'].includes(ext)
      ),
    ];
    return config;
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