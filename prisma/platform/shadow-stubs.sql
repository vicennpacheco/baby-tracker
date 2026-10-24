-- No-op stand-ins for the objects created by supabase-bootstrap.sql, for plain
-- PostgreSQL databases where migrations must replay: Prisma's shadow database
-- (prisma.config.ts → initShadowDb) and the integration test database
-- (scripts/test-db.ts, also in CI's ephemeral Postgres). Idempotent.

-- Supabase's API roles, which the migrations grant to and revoke from. They
-- already exist in every Supabase project, so this only runs on plain
-- PostgreSQL (CI), where the migrating role is a superuser.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
END
$$;
CREATE SCHEMA IF NOT EXISTS private;
CREATE OR REPLACE FUNCTION private.auth_uid() RETURNS uuid
  LANGUAGE sql STABLE AS 'SELECT NULL::uuid';
CREATE OR REPLACE FUNCTION private.add_table_to_realtime(target regclass) RETURNS void
  LANGUAGE plpgsql AS 'BEGIN END';
CREATE OR REPLACE FUNCTION private.broadcast_household_change() RETURNS trigger
  LANGUAGE plpgsql AS 'BEGIN RETURN NULL; END';
CREATE OR REPLACE FUNCTION private.remove_table_from_realtime(target regclass) RETURNS void
  LANGUAGE plpgsql AS 'BEGIN END';
