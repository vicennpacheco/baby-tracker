import * as Sentry from "@sentry/nextjs";

/**
 * Error monitoring on the server and edge runtimes (decision 086). Each
 * runtime loads its own setup, so the Node-only HTTP integration never ends
 * up in the edge bundle. NEXT_RUNTIME is set by Next.js itself for this
 * purpose; it is not app configuration, hence not in src/lib/env.ts.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  } else if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Errors thrown while rendering Server Components, route handlers and
// Server Actions that reach Next.js; handled ones are reported by
// handleActionError.
export const onRequestError = Sentry.captureRequestError;
