import type { Breadcrumb, ErrorEvent } from "@sentry/nextjs";

import { publicEnv } from "@/lib/public-env";
import { scrubEvent } from "@/lib/sentry-privacy";

export type SentryBaseOptions = {
  dsn: string;
  environment: string;
  sendDefaultPii: false;
  sendClientReports: false;
  beforeSend: (event: ErrorEvent) => ErrorEvent;
  beforeBreadcrumb: (breadcrumb: Breadcrumb) => Breadcrumb | null;
};

/**
 * What the client, server and edge SDKs share (decision 086): code exceptions
 * only (no tracing, Session Replay, logs, sessions or client reports), no
 * personal data, and every event scrubbed before it leaves. Each runtime also
 * removes its session integration (sentry-privacy.ts). `undefined` without a
 * DSN: the SDK is not started and nothing is sent, as in local development
 * and tests.
 */
export function sentryBaseOptions(): SentryBaseOptions | undefined {
  const dsn = publicEnv.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return undefined;
  return {
    dsn,
    environment: publicEnv.NEXT_PUBLIC_VERCEL_ENV ?? "development",
    sendDefaultPii: false,
    // SDK self-telemetry about dropped events, not exceptions of the app.
    sendClientReports: false,
    beforeSend: scrubEvent,
    // Typed input is dropped as soon as it is recorded, not only at send time.
    beforeBreadcrumb: (breadcrumb) =>
      breadcrumb.category === "ui.input" ? null : breadcrumb,
  };
}
