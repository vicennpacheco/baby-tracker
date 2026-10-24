import type { ErrorEvent } from "@sentry/nextjs";
import { describe, expect, it } from "vitest";

import {
  isEuSentryDsn,
  sanitizeError,
  scrubEvent,
  withoutBrowserSessions,
  withoutRequestSessions,
} from "@/lib/sentry-privacy";

const EU_DSN =
  "https://0123456789abcdef0123456789abcdef@o123456.ingest.de.sentry.io/4507654321";

describe("isEuSentryDsn", () => {
  it("accepts a DSN of Sentry's EU region", () => {
    expect(isEuSentryDsn(EU_DSN)).toBe(true);
  });

  it.each([
    "https://0123456789abcdef0123456789abcdef@o123456.ingest.us.sentry.io/4507654321",
    "https://0123456789abcdef0123456789abcdef@o123456.ingest.sentry.io/4507654321",
    "https://key@o1.ingest.de.sentry.io.evil.example/1",
    "http://0123456789abcdef0123456789abcdef@o123456.ingest.de.sentry.io/4507654321",
    "not a url",
  ])("refuses %s", (dsn) => {
    expect(isEuSentryDsn(dsn)).toBe(false);
  });
});

describe("scrubEvent", () => {
  const event: ErrorEvent = {
    type: undefined,
    message: "Failed to save",
    request: {
      method: "POST",
      url: "https://app.example/feeding/new?day=2026-10-24#top",
      data: { amountMl: 120, notes: "vomitó" },
      cookies: { "sb-access-token": "secret" },
      headers: { cookie: "sb=secret", "user-agent": "iPhone" },
      query_string: "day=2026-10-24",
    },
    user: { id: "user-1", email: "parent@example.com", ip_address: "1.2.3.4" },
    breadcrumbs: [
      { category: "ui.input", message: "input[name=notes]" },
      { category: "console", message: "values { amountMl: 120 }" },
      {
        category: "navigation",
        data: { from: "/sleep?day=2026-10-23", to: "/feeding?day=2026-10-24" },
      },
      {
        category: "fetch",
        data: { url: "/api/reports/1?token=abc", method: "GET" },
      },
      { category: "ui.click", message: "button.save" },
    ],
  };

  it("keeps only the method and the URL without query or hash", () => {
    expect(scrubEvent(event).request).toEqual({
      method: "POST",
      url: "https://app.example/feeding/new",
    });
  });

  it("keeps only the user id", () => {
    expect(scrubEvent(event).user).toEqual({ id: "user-1" });
  });

  it("drops typed input and console breadcrumbs", () => {
    const categories = scrubEvent(event).breadcrumbs?.map((b) => b.category);
    expect(categories).toEqual(["navigation", "fetch", "ui.click"]);
  });

  it("strips query strings from breadcrumb URLs", () => {
    const [navigation, fetch] = scrubEvent(event).breadcrumbs ?? [];
    expect(navigation?.data).toEqual({ from: "/sleep", to: "/feeding" });
    expect(fetch?.data).toEqual({ url: "/api/reports/1", method: "GET" });
  });

  it("leaves an event without request, user or breadcrumbs untouched", () => {
    const bare: ErrorEvent = { type: undefined, message: "boom" };
    expect(scrubEvent(bare)).toEqual(bare);
  });
});

describe("sanitizeError", () => {
  it("keeps the name, the code and the stack frames but never the message", () => {
    const original = new Error(
      "Invalid `db.feeding.create()`: amountMl: 120, notes: 'vomitó'",
    );
    original.name = "PrismaClientValidationError";
    const safe = sanitizeError(original, "P2009");

    expect(safe.name).toBe("PrismaClientValidationError");
    expect(safe.message).toBe("PrismaClientValidationError (P2009)");
    expect(safe.stack).not.toContain("vomitó");
    expect(safe.stack).not.toContain("amountMl");
    expect(
      safe.stack
        ?.split("\n")
        .slice(1)
        .every((line) => line.trimStart().startsWith("at ")),
    ).toBe(true);
    expect(safe.stack?.split("\n").length).toBeGreaterThan(1);
  });

  it("describes a thrown non-Error by its type", () => {
    const safe = sanitizeError("raw string with data", undefined);
    expect(safe.message).toBe("string");
    expect(safe.stack).not.toContain("raw string");
  });
});

describe("withoutBrowserSessions", () => {
  it("drops release-health sessions and keeps the error integrations", () => {
    const integrations = [
      { name: "GlobalHandlers" },
      { name: "BrowserSession" },
      { name: "Dedupe" },
    ];
    expect(withoutBrowserSessions(integrations).map((i) => i.name)).toEqual([
      "GlobalHandlers",
      "Dedupe",
    ]);
  });
});

describe("withoutRequestSessions", () => {
  it("replaces the HTTP integration with one that tracks no sessions", () => {
    const calls: unknown[] = [];
    const replacement = { name: "Http" };
    const result = withoutRequestSessions(
      [{ name: "OnUncaughtException" }, { name: "Http" }],
      (options) => {
        calls.push(options);
        return replacement;
      },
    );
    expect(calls).toEqual([
      { disableIncomingRequestSpans: true, sessions: false },
    ]);
    expect(result).toEqual([{ name: "OnUncaughtException" }, replacement]);
    expect(result[1]).toBe(replacement);
  });

  it("leaves runtimes without an HTTP integration untouched", () => {
    const integrations = [{ name: "WinterCGFetch" }];
    expect(
      withoutRequestSessions(integrations, () => {
        throw new Error("must not be called");
      }),
    ).toEqual(integrations);
  });
});
