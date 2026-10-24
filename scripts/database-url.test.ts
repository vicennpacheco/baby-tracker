import { describe, expect, it } from "vitest";

import {
  assertDevProject,
  assertSafeTestTarget,
  assertTestDatabase,
  isLoopbackUrl,
  withDatabase,
} from "./database-url";

const URL_6543 =
  "postgresql://prisma.abcdefghijklmnopqrst:secret@aws-1-eu-west-3.pooler.supabase.com:6543/postgres?pgbouncer=true";

describe("withDatabase", () => {
  it("swaps only the database name, keeping credentials, port and params", () => {
    expect(withDatabase(URL_6543, "baby_tracker_test")).toBe(
      "postgresql://prisma.abcdefghijklmnopqrst:secret@aws-1-eu-west-3.pooler.supabase.com:6543/baby_tracker_test?pgbouncer=true",
    );
  });
});

describe("assertTestDatabase", () => {
  it("allows only baby_tracker_test", () => {
    expect(() => assertTestDatabase("baby_tracker_test")).not.toThrow();
  });

  it.each(["postgres", "baby_tracker", undefined])(
    "refuses to reset %j",
    (name) => {
      expect(() => assertTestDatabase(name)).toThrow(/Refusing to reset/);
    },
  );
});

describe("assertDevProject", () => {
  it("accepts URLs of the dev project", () => {
    expect(() =>
      assertDevProject(URL_6543, "abcdefghijklmnopqrst"),
    ).not.toThrow();
  });

  it("refuses any other project", () => {
    expect(() => assertDevProject(URL_6543, "zzzzzzzzzzzzzzzzzzzz")).toThrow(
      /not the dev Supabase project/,
    );
  });
});

const LOOPBACK = "postgresql://postgres:postgres@127.0.0.1:5432/postgres";

describe("isLoopbackUrl", () => {
  it.each([
    LOOPBACK,
    "postgresql://postgres:postgres@localhost:6543/postgres",
    "postgresql://postgres:postgres@[::1]:5432/postgres",
  ])("recognizes %s", (url) => {
    expect(isLoopbackUrl(url)).toBe(true);
  });

  it("does not treat a Supabase host as loopback", () => {
    expect(isLoopbackUrl(URL_6543)).toBe(false);
  });
});

describe("assertSafeTestTarget", () => {
  it("accepts a loopback database without a project ref", () => {
    expect(() => assertSafeTestTarget(LOOPBACK, undefined)).not.toThrow();
  });

  it("accepts the dev project", () => {
    expect(() =>
      assertSafeTestTarget(URL_6543, "abcdefghijklmnopqrst"),
    ).not.toThrow();
  });

  it("refuses a remote host without a project ref", () => {
    expect(() => assertSafeTestTarget(URL_6543, undefined)).toThrow(
      /Refusing to continue/,
    );
  });

  it("refuses a remote host of another project", () => {
    expect(() =>
      assertSafeTestTarget(URL_6543, "zzzzzzzzzzzzzzzzzzzz"),
    ).toThrow(/not the dev Supabase project/);
  });

  it("refuses a remote host named like loopback", () => {
    expect(() =>
      assertSafeTestTarget(
        "postgresql://localhost:pw@db.example.com:5432/localhost",
        undefined,
      ),
    ).toThrow(/Refusing to continue/);
  });
});
