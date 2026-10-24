/**
 * Read-only check of a database after `prisma migrate deploy` (CLAUDE.md rule
 * 0.2, decisions 076 and 088):
 *
 *   npm run db:verify
 *
 * Connects to VERIFY_DATABASE_URL, or else DIRECT_URL, runs SELECTs only and
 * exits with code 1 if any check fails. Realtime checks are skipped on plain
 * PostgreSQL (CI).
 */
import { existsSync, readdirSync } from "node:fs";

import { Client } from "pg";

import {
  type AppliedMigration,
  checkDatabase,
  type DatabaseSnapshot,
} from "./verify-db-checks";

// Every household table whose changes the other devices must hear about
// (decision 066). New ones are added here in the same change as their trigger.
const BROADCAST_TABLES = [
  "feedings",
  "diaper_changes",
  "sleep_sessions",
  "growth_measurements",
  "health_records",
];

if (existsSync(".env")) process.loadEnvFile(".env");

const url = process.env.VERIFY_DATABASE_URL ?? process.env.DIRECT_URL;
if (!url) throw new Error("Set VERIFY_DATABASE_URL or DIRECT_URL");
const caCert = process.env.DATABASE_CA_CERT;

/** Every row's value of one column, typed by pg's generic. */
async function column<V, K extends string = string>(
  client: Client,
  sql: string,
  key: K,
): Promise<V[]> {
  const { rows } = await client.query<Record<K, V>>(sql);
  return rows.map((row) => row[key]);
}

async function readSnapshot(client: Client): Promise<DatabaseSnapshot> {
  const migrationFolders = readdirSync("prisma/migrations", {
    withFileTypes: true,
  })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  const { rows: migrations } = await client.query<AppliedMigration>(`
    SELECT migration_name AS name,
           finished_at IS NOT NULL AS finished,
           rolled_back_at IS NOT NULL AS "rolledBack"
    FROM public._prisma_migrations`);

  const tablesWithoutRls = await column<string>(
    client,
    `SELECT tablename FROM pg_catalog.pg_tables
     WHERE schemaname = 'public' AND NOT rowsecurity
       AND tablename <> '_prisma_migrations'`,
    "tablename",
  );

  const withTrigger = new Set(
    await column<string>(
      client,
      `SELECT c.relname FROM pg_catalog.pg_trigger t
       JOIN pg_catalog.pg_class c ON c.oid = t.tgrelid
       JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND t.tgname = 'broadcast_household_change'
         AND NOT t.tgisinternal`,
      "relname",
    ),
  );

  const [realtimeAvailable = false] = await column<boolean>(
    client,
    `SELECT EXISTS (SELECT 1 FROM pg_catalog.pg_publication
                    WHERE pubname = 'supabase_realtime')
        AND EXISTS (SELECT 1 FROM pg_catalog.pg_class c
                    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
                    WHERE n.nspname = 'realtime' AND c.relname = 'messages')
        AS available`,
    "available",
  );

  const publishedAppTables = realtimeAvailable
    ? await column<string>(
        client,
        `SELECT tablename FROM pg_catalog.pg_publication_tables
         WHERE pubname = 'supabase_realtime' AND schemaname = 'public'`,
        "tablename",
      )
    : [];

  // Realtime names its daily partitions messages_YYYY_MM_DD (UTC). Catalogs
  // only: the prisma role has no USAGE on the realtime schema, which
  // to_regclass('realtime.messages') would require.
  const partitions = realtimeAvailable
    ? new Set(
        await column<string>(
          client,
          `SELECT c.relname FROM pg_catalog.pg_inherits i
           JOIN pg_catalog.pg_class c ON c.oid = i.inhrelid
           JOIN pg_catalog.pg_class p ON p.oid = i.inhparent
           JOIN pg_catalog.pg_namespace n ON n.oid = p.relnamespace
           WHERE n.nspname = 'realtime' AND p.relname = 'messages'`,
          "relname",
        ),
      )
    : new Set<string>();
  const partitionFor = (daysAgo: number): string => {
    const day = new Date(Date.now() - daysAgo * 86_400_000);
    return `messages_${day.toISOString().slice(0, 10).replaceAll("-", "_")}`;
  };
  const realtimePartition = partitions.has(partitionFor(0))
    ? "today"
    : partitions.has(partitionFor(1))
      ? "yesterday"
      : "none";

  const [tenantRoleBypassesRls = null] = await column<boolean>(
    client,
    `SELECT rolbypassrls FROM pg_catalog.pg_roles WHERE rolname = 'app_tenant'`,
    "rolbypassrls",
  );

  return {
    migrationFolders,
    appliedMigrations: migrations,
    tablesWithoutRls,
    recordTablesWithoutBroadcast: BROADCAST_TABLES.filter(
      (table) => !withTrigger.has(table),
    ),
    publishedAppTables,
    realtimeAvailable,
    realtimePartition,
    tenantRoleBypassesRls,
  };
}

async function main(connectionString: string): Promise<void> {
  const client = new Client({
    connectionString,
    ssl: caCert
      ? { ca: caCert, rejectUnauthorized: true }
      : { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    // Belt and braces: this script must never write.
    await client.query("SET default_transaction_read_only = on");
    const results = checkDatabase(await readSnapshot(client));
    for (const { name, status, detail } of results) {
      const line = `${status.toUpperCase().padEnd(7)} ${name}${detail ? ` — ${detail}` : ""}`;
      if (status === "fail" || status === "warn") console.error(line);
      else process.stdout.write(`${line}\n`);
    }
    if (results.some((result) => result.status === "fail")) {
      process.exitCode = 1;
    }
  } finally {
    await client.end();
  }
}

main(url).catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
