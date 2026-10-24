import type { Breadcrumb, ErrorEvent } from "@sentry/nextjs";

/**
 * Privacy rules for error monitoring (decision 086): telemetry stays in
 * Sentry's EU region and carries no personal or health data. Pure functions,
 * shared by the client, server and edge SDKs.
 */

const EU_INGEST_HOST = /^o\d+\.ingest\.de\.sentry\.io$/;

/** Only DSNs of Sentry's EU data region; anything else must not start the SDK. */
export function isEuSentryDsn(dsn: string): boolean {
  try {
    const url = new URL(dsn);
    return (
      url.protocol === "https:" &&
      url.username !== "" &&
      EU_INGEST_HOST.test(url.hostname) &&
      /^\/\d+$/.test(url.pathname)
    );
  } catch {
    return false;
  }
}

// Query strings carry days, tokens and ids; fragments, UI state.
function stripQuery(url: string): string {
  return url.split(/[?#]/, 1)[0] ?? url;
}

// Typed input could be a note about the baby's health; console output could
// print form values.
const DROPPED_BREADCRUMBS = new Set(["ui.input", "console"]);
const URL_FIELDS = new Set(["url", "from", "to"]);

function scrubBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb {
  if (!breadcrumb.data) return breadcrumb;
  const data = Object.fromEntries(
    Object.entries(breadcrumb.data).map(([key, value]: [string, unknown]) => [
      key,
      URL_FIELDS.has(key) && typeof value === "string"
        ? stripQuery(value)
        : value,
    ]),
  );
  return { ...breadcrumb, data };
}

/**
 * `beforeSend` for every runtime: request bodies, cookies, headers and query
 * strings never leave the app, the user is only an id, and breadcrumbs lose
 * typed input, console output and URL parameters.
 */
export function scrubEvent(event: ErrorEvent): ErrorEvent {
  const scrubbed: ErrorEvent = { ...event };
  if (event.request) {
    scrubbed.request = {
      method: event.request.method,
      url: event.request.url ? stripQuery(event.request.url) : undefined,
    };
  }
  if (event.user) {
    scrubbed.user = event.user.id === undefined ? {} : { id: event.user.id };
  }
  if (event.breadcrumbs) {
    scrubbed.breadcrumbs = event.breadcrumbs
      .filter((b) => !DROPPED_BREADCRUMBS.has(b.category ?? ""))
      .map(scrubBreadcrumb);
  }
  return scrubbed;
}

/**
 * An unexpected server error as Sentry may see it: its name, the Prisma code
 * and the stack frames, never the message, which can quote the values of a
 * query (CLAUDE.md §3.3).
 */
export function sanitizeError(error: unknown, code: string | undefined): Error {
  const name = error instanceof Error ? error.name : typeof error;
  const safe = new Error(code ? `${name} (${code})` : name);
  safe.name = name;
  const frames =
    error instanceof Error && error.stack
      ? error.stack
          .split("\n")
          .filter((line) => line.trimStart().startsWith("at "))
      : [];
  safe.stack = [`${name}: ${safe.message}`, ...frames].join("\n");
  return safe;
}

// Release-health sessions measure usage, not code errors: decision 086 sends
// exceptions only. Integrations are matched by their stable `name`.
type NamedIntegration = { name: string };

/** Browser: without the integration that opens a session per page load. */
export function withoutBrowserSessions<T extends NamedIntegration>(
  integrations: T[],
): T[] {
  return integrations.filter(
    (integration) => integration.name !== "BrowserSession",
  );
}

/**
 * Node: the Next.js SDK swaps in httpIntegration({ disableIncomingRequestSpans:
 * true }), which still aggregates a session per incoming request. Same swap,
 * sessions off. Runtimes without it (edge) are left as they are.
 */
export function withoutRequestSessions<T extends NamedIntegration>(
  integrations: T[],
  httpIntegration: (options: {
    disableIncomingRequestSpans: boolean;
    sessions: boolean;
  }) => T,
): T[] {
  return integrations.map((integration) =>
    integration.name === "Http"
      ? httpIntegration({ disableIncomingRequestSpans: true, sessions: false })
      : integration,
  );
}
