export const TEST_DATABASE = "baby_tracker_test";

/** Same connection, different database: credentials, host, port and params kept. */
export function withDatabase(url: string, database: string): string {
  const parsed = new URL(url);
  parsed.pathname = `/${database}`;
  return parsed.toString();
}

/** Guard before any destructive test setup (TRUNCATE): test database only. */
export function assertTestDatabase(currentDatabase: string | undefined): void {
  if (currentDatabase !== TEST_DATABASE) {
    throw new Error(
      `Refusing to reset database "${currentDatabase ?? "?"}": only ${TEST_DATABASE} may be truncated.`,
    );
  }
}

// WHATWG URL keeps the brackets of an IPv6 hostname.
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** A database on this machine: CI's ephemeral Postgres, never a shared one. */
export function isLoopbackUrl(url: string): boolean {
  return LOOPBACK_HOSTS.has(new URL(url).hostname);
}

/**
 * Where test setup may create, migrate and reset databases: an ephemeral
 * loopback Postgres, or the dev/staging Supabase project and nothing else.
 * Only the hostname counts, so "localhost" as a user or database name on a
 * remote host is still refused.
 */
export function assertSafeTestTarget(
  url: string,
  devProjectRef: string | undefined,
): void {
  if (isLoopbackUrl(url)) return;
  if (devProjectRef === undefined) {
    throw new Error(
      "Refusing to continue: a remote test database needs SEED_DEV_PROJECT_REF.",
    );
  }
  assertDevProject(url, devProjectRef);
}

/** Supavisor users are `<role>.<project-ref>`; refuse anything but dev. */
export function assertDevProject(url: string, devProjectRef: string): void {
  if (!new URL(url).username.endsWith(`.${devProjectRef}`)) {
    throw new Error(
      "Refusing to continue: this is not the dev Supabase project.",
    );
  }
}
