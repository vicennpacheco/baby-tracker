import { assertNever } from "../src/lib/assert-never";

/**
 * The post-migration checks of CLAUDE.md rule 0.2 as a pure function over a
 * snapshot of the database, so they are testable without one. The SQL that
 * builds the snapshot lives in verify-db.ts.
 */

export type AppliedMigration = {
  name: string;
  finished: boolean;
  rolledBack: boolean;
};

export type DatabaseSnapshot = {
  /** Folder names under prisma/migrations. */
  migrationFolders: string[];
  /** Rows of public._prisma_migrations. */
  appliedMigrations: AppliedMigration[];
  /** Tables of `public` with RLS disabled. */
  tablesWithoutRls: string[];
  /** Household tables missing the broadcast_household_change trigger. */
  recordTablesWithoutBroadcast: string[];
  /** Tables of `public` in the supabase_realtime publication (decision 066). */
  publishedAppTables: string[];
  /** False on plain PostgreSQL (CI), where Supabase Realtime does not exist. */
  realtimeAvailable: boolean;
  /**
   * realtime.send silently drops messages without today's partition, which
   * Realtime creates when the day's first client connects (decision 066).
   */
  realtimePartition: "today" | "yesterday" | "none";
  /** null until the app_tenant role exists (phase K2, decision 078). */
  tenantRoleBypassesRls: boolean | null;
};

export type CheckResult = {
  name: string;
  /** "warn" is reported but does not fail the run. */
  status: "pass" | "warn" | "fail" | "skipped";
  detail?: string;
};

function listOrPass(
  name: string,
  offenders: string[],
  what: string,
): CheckResult {
  return offenders.length === 0
    ? { name, status: "pass" }
    : { name, status: "fail", detail: `${what}: ${offenders.join(", ")}` };
}

function checkMigrations(snapshot: DatabaseSnapshot): CheckResult {
  const applied = new Set(snapshot.appliedMigrations.map((m) => m.name));
  const folders = new Set(snapshot.migrationFolders);
  const problems = [
    ...snapshot.migrationFolders
      .filter((name) => !applied.has(name))
      .map((name) => `${name} not applied`),
    ...snapshot.appliedMigrations
      .filter((m) => !folders.has(m.name))
      .map((m) => `${m.name} has no folder`),
    ...snapshot.appliedMigrations
      .filter((m) => !m.finished || m.rolledBack)
      .map((m) => `${m.name} unfinished or rolled back`),
  ];
  return problems.length === 0
    ? { name: "migrations", status: "pass" }
    : { name: "migrations", status: "fail", detail: problems.join("; ") };
}

function checkPartitions(
  partition: DatabaseSnapshot["realtimePartition"],
): CheckResult {
  const name = "realtime-partitions";
  switch (partition) {
    case "today":
      return { name, status: "pass" };
    case "yesterday":
      return {
        name,
        status: "warn",
        detail:
          "no partition for today yet; Realtime creates it when the first client connects",
      };
    case "none":
      return {
        name,
        status: "fail",
        detail: "realtime.messages has no partition for today or yesterday",
      };
    default:
      return assertNever(partition);
  }
}

export function checkDatabase(snapshot: DatabaseSnapshot): CheckResult[] {
  const skippedRealtime = (name: string): CheckResult => ({
    name,
    status: "skipped",
    detail: "no Supabase Realtime in this database",
  });

  return [
    checkMigrations(snapshot),
    listOrPass("rls", snapshot.tablesWithoutRls, "RLS disabled on"),
    listOrPass(
      "broadcast-triggers",
      snapshot.recordTablesWithoutBroadcast,
      "no broadcast_household_change trigger on",
    ),
    snapshot.realtimeAvailable
      ? listOrPass(
          "realtime-publication",
          snapshot.publishedAppTables,
          "published to supabase_realtime",
        )
      : skippedRealtime("realtime-publication"),
    snapshot.realtimeAvailable
      ? checkPartitions(snapshot.realtimePartition)
      : skippedRealtime("realtime-partitions"),
    snapshot.tenantRoleBypassesRls === null
      ? {
          name: "tenant-role",
          status: "skipped",
          detail: "app_tenant does not exist yet",
        }
      : snapshot.tenantRoleBypassesRls
        ? {
            name: "tenant-role",
            status: "fail",
            detail: "app_tenant has BYPASSRLS",
          }
        : { name: "tenant-role", status: "pass" },
  ];
}
