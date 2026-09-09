import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /^https?.*/,
      handler: "NetworkFirst",
      options: {
        cacheName: "offlineCache",
        expiration: {
          maxEntries: 200,
        },
      },
    },
  ],
});

const nextConfig: NextConfig = {
  /**
   * `/catalog` rendered the single word "Catalog" and was linked from nowhere. `/category` is
   * the catalogue, under the name the rest of the site uses.
   *
   * Done here rather than with `redirect()` in a page, because a page-level redirect rendered
   * the destination WITHOUT changing the URL — two URLs serving one page, which is the
   * duplicate content a redirect exists to avoid. A config redirect answers 308 before routing
   * happens at all.
   *
   * `/faqs` was the same kind of stub and is simply gone: there is no equivalent page to send
   * anyone to, and writing questions and answers on the owner's behalf would be worse than a
   * 404.
   */
  async redirects() {
    return [
      { source: '/:locale(en|ar)/catalog', destination: '/:locale/category', permanent: true },
      { source: '/catalog', destination: '/category', permanent: true },
    ]
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https://res.cloudinary.com https://images.unsplash.com https://api.dicebear.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self'; frame-src 'self' https://maps.google.com https://www.google.com; worker-src 'self' blob:;",
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          }
        ],
      },
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript; charset=utf-8',
          },
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self'",
          },
        ],
      },
    ]
  },
  typescript: {
    ignoreBuildErrors: false
  },
  reactStrictMode: true,
  transpilePackages: ["@repo/database"],
  compiler: {
    styledComponents: true,
  },
  compress: true,
  poweredByHeader: false,
  images: {
    // ADR 0002 — the Cloudinary loader is applied per source in components/app-image.tsx,
    // not here: `loader: "custom"` is global and disables /_next/image, which every asset
    // in /public still needs.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "api.dicebear.com",
      },
    ],
  },
};

const withNextIntl = createNextIntlPlugin();
let config = withNextIntl(nextConfig);
config = withPWA(config);

export default config;