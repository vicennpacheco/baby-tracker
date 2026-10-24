import * as Sentry from "@sentry/nextjs";

import { sentryBaseOptions } from "@/lib/sentry-config";

/**
 * Error monitoring on the server and edge runtimes (decision 086). The same
 * import resolves to the Node or the edge SDK for each runtime.
 */
export function register(): void {
  const options = sentryBaseOptions();
  if (options) Sentry.init(options);
}

// Errors thrown while rendering Server Components, route handlers and
// Server Actions that reach Next.js; handled ones are reported by
// handleActionError.
export const onRequestError = Sentry.captureRequestError;
