import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  logging: {
    // `next dev` prints every Server Action call with its arguments: emails,
    // OTP codes and, later, health records. Keep them out of the terminal.
    serverFunctions: false,
  },
  cacheComponents: true,
  partialPrefetching: true,
  // The service worker (decision 072): never cached, so a fix reaches the
  // phones on the next visit, and limited to scripts from this origin.
  headers: async () => [
    {
      source: "/sw.js",
      headers: [
        {
          key: "Content-Type",
          value: "application/javascript; charset=utf-8",
        },
        {
          key: "Cache-Control",
          value: "no-cache, no-store, must-revalidate",
        },
        {
          key: "Content-Security-Policy",
          value: "default-src 'self'; script-src 'self'",
        },
      ],
    },
  ],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
