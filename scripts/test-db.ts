/**
 * Creates (if missing) and migrates the integration test database, either in
 * the dev/staging Supabase project or in an ephemeral loopback Postgres (CI):
 *
 *   npm run test:db
 *
 * Safe to re-run: CREATE DATABASE only when absent; stubs and migrations are
 * idempotent. Refuses any remote database that is not SEED_DEV_PROJECT_REF's
 * (assertSafeTestTarget).
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { Client } from "pg";

import {
  assertSafeTestTarget,
  TEST_DATABASE,
  withDatabase,
} from "./database-url";

// CI injects the variables directly and has no .env file.
if (existsSync(".env")) process.loadEnvFile(".env");

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} (in .env or the environment)`);
  return value;
}

const directUrl = requireEnv("DIRECT_URL");
// Optional only for a loopback database: assertSafeTestTarget decides.
const devProjectRef = process.env.SEED_DEV_PROJECT_REF;
const caCert = process.env.DATABASE_CA_CERT;
const ssl = caCert
  ? { ca: caCert, rejectUnauthorized: true }
  : { rejectUnauthorized: false };

async function withClient(
  url: string,
  run: (client: Client) => Promise<void>,
): Promise<void> {
  const client = new Client({ connectionString: url, ssl });
  await client.connect();
  try {
    await run(client);
  } finally {
    await client.end();
  }
}

async function main(): Promise<void> {
  assertSafeTestTarget(directUrl, devProjectRef);
  const testUrl = withDatabase(directUrl, TEST_DATABASE);

  await withClient(directUrl, async (client) => {
    const { rowCount } = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [TEST_DATABASE],
    );
    // The name is a constant, never user input, so interpolation is safe.
    if (rowCount === 0) await client.query(`CREATE DATABASE ${TEST_DATABASE}`);
  });

  await withClient(testUrl, async (client) => {
    await client.query(
      readFileSync("prisma/platform/shadow-stubs.sql", "utf8"),
    );
  });

  // Run the Prisma CLI through Node itself: no shell, so arguments are never
  // re-parsed (spawning npx.cmd on Windows would require one).
  // prisma.config.ts loads .env without overriding, so this DIRECT_URL wins.
  execFileSync(
    process.execPath,
    [join("node_modules", "prisma", "build", "index.js"), "migrate", "deploy"],
    { env: { ...process.env, DIRECT_URL: testUrl }, stdio: "inherit" },
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
