import { withSentryConfig } from "@sentry/nextjs/config";
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

// Error monitoring (decision 086). Build-time only: the runtime setup lives in
// src/instrumentation*.ts. Every Sentry endpoint used here is in the EU.
const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN;

export default withSentryConfig(nextConfig, {
  org: "nidly",
  project: process.env.SENTRY_PROJECT,
  // Source map uploads go to the EU region's API, never to sentry.io (US).
  sentryUrl: "https://de.sentry.io/",
  authToken: sentryAuthToken,
  // Browser events reach Sentry through this app (Vercel, cdg1) instead of
  // straight from the device: they stay in Europe end to end and ad blockers
  // do not drop them. Excluded from the proxy matcher (src/proxy.ts).
  tunnelRoute: "/monitoring",
  // The build plugin's own usage telemetry would go to Sentry's US region.
  telemetry: false,
  silent: !process.env.CI,
  // Readable stack traces only when a token is configured (Vercel, CI);
  // local builds without one skip the upload instead of failing. Uploaded
  // maps are deleted from the build output, so they are never served.
  sourcemaps: {
    disable: sentryAuthToken ? false : "disable-upload",
    deleteSourcemapsAfterUpload: true,
  },
});
