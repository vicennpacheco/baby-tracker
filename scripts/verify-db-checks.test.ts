import { describe, expect, it } from "vitest";

import { checkDatabase, type DatabaseSnapshot } from "./verify-db-checks";

const HEALTHY: DatabaseSnapshot = {
  migrationFolders: ["20261007220542_init", "20261008115554_invite_code_hash"],
  appliedMigrations: [
    { name: "20261007220542_init", finished: true, rolledBack: false },
    {
      name: "20261008115554_invite_code_hash",
      finished: true,
      rolledBack: false,
    },
  ],
  tablesWithoutRls: [],
  recordTablesWithoutBroadcast: [],
  publishedAppTables: [],
  realtimeAvailable: true,
  realtimePartition: "today",
  tenantRoleBypassesRls: false,
};

function statusOf(snapshot: DatabaseSnapshot, name: string): string {
  const result = checkDatabase(snapshot).find((check) => check.name === name);
  if (!result) throw new Error(`No check named ${name}`);
  return result.status;
}

describe("checkDatabase", () => {
  it("passes a healthy database", () => {
    expect(
      checkDatabase(HEALTHY).every((check) => check.status === "pass"),
    ).toBe(true);
  });

  it("fails when a migration folder was never applied", () => {
    expect(
      statusOf(
        {
          ...HEALTHY,
          migrationFolders: [...HEALTHY.migrationFolders, "20261101000000_x"],
        },
        "migrations",
      ),
    ).toBe("fail");
  });

  it("fails when the database has a migration with no folder", () => {
    expect(
      statusOf(
        { ...HEALTHY, migrationFolders: ["20261007220542_init"] },
        "migrations",
      ),
    ).toBe("fail");
  });

  it("fails on an unfinished or rolled back migration", () => {
    const [first, second] = HEALTHY.appliedMigrations;
    if (!first || !second) throw new Error("fixture");
    expect(
      statusOf(
        {
          ...HEALTHY,
          appliedMigrations: [first, { ...second, finished: false }],
        },
        "migrations",
      ),
    ).toBe("fail");
    expect(
      statusOf(
        {
          ...HEALTHY,
          appliedMigrations: [first, { ...second, rolledBack: true }],
        },
        "migrations",
      ),
    ).toBe("fail");
  });

  it("names the tables without RLS", () => {
    const result = checkDatabase({
      ...HEALTHY,
      tablesWithoutRls: ["feedings"],
    }).find((check) => check.name === "rls");
    expect(result?.status).toBe("fail");
    expect(result?.detail).toContain("feedings");
  });

  it("fails when a record table has no broadcast trigger", () => {
    expect(
      statusOf(
        { ...HEALTHY, recordTablesWithoutBroadcast: ["sleep_sessions"] },
        "broadcast-triggers",
      ),
    ).toBe("fail");
  });

  it("fails when an app table is published to supabase_realtime", () => {
    expect(
      statusOf(
        { ...HEALTHY, publishedAppTables: ["diaper_changes"] },
        "realtime-publication",
      ),
    ).toBe("fail");
  });

  it("warns, without failing, when only yesterday's partition exists", () => {
    expect(
      statusOf(
        { ...HEALTHY, realtimePartition: "yesterday" },
        "realtime-partitions",
      ),
    ).toBe("warn");
  });

  it("fails without a recent realtime.messages partition", () => {
    expect(
      statusOf(
        { ...HEALTHY, realtimePartition: "none" },
        "realtime-partitions",
      ),
    ).toBe("fail");
  });

  it("skips the realtime checks on plain PostgreSQL", () => {
    const plain = {
      ...HEALTHY,
      realtimeAvailable: false,
      realtimePartition: "none" as const,
    };
    expect(statusOf(plain, "realtime-partitions")).toBe("skipped");
    expect(statusOf(plain, "realtime-publication")).toBe("skipped");
  });

  it("fails when app_tenant bypasses RLS and skips it before K2", () => {
    expect(
      statusOf({ ...HEALTHY, tenantRoleBypassesRls: true }, "tenant-role"),
    ).toBe("fail");
    expect(
      statusOf({ ...HEALTHY, tenantRoleBypassesRls: null }, "tenant-role"),
    ).toBe("skipped");
  });
});
