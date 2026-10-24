# K0 · Fundaciones — plan de implementación

> **Para agentes:** sub-skill recomendada `superpowers:executing-plans` (ejecución nativa en la sesión). Los pasos usan casillas (`- [ ]`) para el seguimiento.

**Objetivo:** que ningún cambio llegue a producción sin pasar por CI y staging, y que ningún test toque la instancia de producción.

**Arquitectura:**
- **Tests de integración en CI:** Postgres 17 efímero en GitHub Actions, que imita a Supabase con los roles `anon`/`authenticated` y los *stubs* del *bootstrap*. Una guarda permite resetear solo bases de datos locales (*loopback*) o la de tests del proyecto de staging.
- **Verificación de la BD:** `verify-db` convierte la regla 0.2 en código y corre en cada lanzamiento.
- **Despliegue:** producción se despliega solo con el *workflow* manual `release` (staging → aprobación → producción → Vercel).

**Tech stack:** GitHub Actions, Docker `postgres:17` en el *runner*, `pg`, Prisma 7 CLI, Vitest 5, Vercel CLI, Supabase MCP.

**Spec:** [`PLAN_ESCALABILIDAD_NIDLY.md`](../../../PLAN_ESCALABILIDAD_NIDLY.md) §2–§4 y §12 (K0); decisiones 074, 075, 076, 086 y 088 en [`docs/architecture/decisions.md`](../../architecture/decisions.md).

## Restricciones globales

- **Node** ≥ 24 (`package.json` → `engines`). **Prisma 7.10.0** fijado. Sin dependencias nuevas en K0, salvo `@sentry/nextjs` (decisión 086, tarea 7).
- **Guardas de reset:** `TRUNCATE` solo en la base `baby_tracker_test` (decisiones 037 y 038). El nombre se cambia con la marca definitiva, no en K0.
- **App en CI:** `DATABASE_URL` debe usar el puerto **6543** (`src/lib/env.ts`) y `src/lib/db.ts` **siempre** pide TLS, así que el Postgres de CI arranca con `ssl=on`.
- **Secretos:** nunca en el repositorio ni en el chat. Los *secrets* de GitHub y las variables de Vercel los introduce el usuario.
- **Paradas:** antes de crear recursos (staging), de cualquier operación destructiva sobre una BD de Supabase y de cualquier `git push`, se pide confirmación explícita.
- **Commits:** Conventional Commits en inglés, firmados solo por el usuario, sin *trailers* de atribución.

## Puntos de atención en la revisión

1. **Postgres de CI sin TLS:** `db.ts` fallaría con «The server does not support SSL connections». El contenedor arranca con `-c ssl=on` y el certificado *snakeoil* de la imagen (tarea 3).
2. **Guarda engañada por un host remoto con el nombre `localhost` en el usuario o en la base de datos:** solo cuenta el *hostname* de la URL (tarea 1, test `refuses a remote host named like loopback`).
3. **`verify-db` contra un Postgres sin Supabase** (CI): las comprobaciones de Realtime se marcan como «omitidas», no como fallos ni como éxitos (tarea 4).
4. **Lanzamiento con la migración fallida:** el despliegue de Vercel depende (`needs`) de los dos `verify-db`; si uno falla, no se despliega (tarea 5).
5. **Sin `.env` en CI:** `test-db` y `integration-env` no pueden exigir el archivo (tarea 2).

---

### Tarea 1: guarda de la BD de tests (*loopback* o proyecto de staging)

**Archivos:**
- Modificar: `scripts/database-url.ts`
- Test: `scripts/database-url.test.ts`

**Interfaces:**
- Produce `isLoopbackUrl(url: string): boolean`: `true` si el *hostname* es `localhost`, `127.0.0.1` o `::1`.
- Produce `assertSafeTestTarget(url: string, devProjectRef: string | undefined): void`: acepta *loopback*; si no, exige `assertDevProject(url, devProjectRef)`; sin *ref* y sin *loopback*, lanza `Refusing to continue`.

- [x] **Paso 1 — tests que fallan:**
  - `accepts a loopback database without a project ref` (`postgresql://postgres:pg@127.0.0.1:5432/postgres`, `undefined`);
  - `accepts the dev project` (URL Supavisor con `.abcdefghijklmnopqrst`);
  - `refuses a remote host without a project ref`;
  - `refuses a remote host named like loopback` (`postgresql://localhost:pw@db.example.com:5432/localhost`);
  - `isLoopbackUrl` con `[::1]` → `true`.
- [x] **Paso 2:** `npx vitest run --project unit scripts/database-url.test.ts` → FALLA (no existe la función).
- [x] **Paso 3:** implementar con `new URL(url).hostname` (sin corchetes para IPv6).
- [x] **Paso 4:** los tests pasan; prueba de mutación: aceptar cualquier host → el test del host remoto falla. Restaurar.
- [x] **Paso 5:** commit `test(db): allow resetting only loopback or dev test databases`.

### Tarea 2: `test:db` sin `.env` y *stubs* con los roles de Supabase

**Archivos:**
- Modificar: `scripts/test-db.ts`, `prisma/platform/shadow-stubs.sql`

**Interfaces:**
- Consume `assertSafeTestTarget` (tarea 1).
- `test-db.ts` carga `.env` solo si existe; `SEED_DEV_PROJECT_REF` es opcional (obligatorio salvo con *loopback*, vía la guarda).
- `shadow-stubs.sql` crea `anon` y `authenticated` (`NOLOGIN`) solo si no existen (bloque `DO` sobre `pg_roles`). En Supabase ya existen: no hace nada.

- [x] **Paso 1:** cambios; `npm run typecheck` en verde.
- [x] **Paso 2:** comprobar que en Supabase sigue siendo idempotente: el bloque `DO` no ejecuta `CREATE ROLE` porque los roles existen (lectura de `pg_roles` vía MCP, sin escribir).
- [x] **Paso 3:** commit `chore(test): run test:db without .env and stub Supabase roles`.

### Tarea 3: CI en cada PR (`.github/workflows/ci.yml`)

**Archivos:**
- Crear: `.github/workflows/ci.yml`

**Contenido decidido:**
- Disparadores: `pull_request` y `push` a `main`. `concurrency` por rama, cancelando la anterior.
- Job `checks`: Node 24, `npm ci`, `format:check`, `lint`, `typecheck`, `test:unit`, `next build`.
- Job `integration`: `docker run -d -p 5432:5432 -p 6543:5432 postgres:17 -c ssl=on -c ssl_cert_file=/etc/ssl/certs/ssl-cert-snakeoil.pem -c ssl_key_file=/etc/ssl/private/ssl-cert-snakeoil.key`, espera con `pg_isready`, `npm run test:db` y `npm run test:int`.
- `prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --exit-code`, verificando las opciones contra la CLI 7.10 instalada.
- Variables de CI (no son secretos): `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:6543/postgres?pgbouncer=true`, `DIRECT_URL=…:5432/postgres`, `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_ci`.
- Permisos mínimos (`contents: read`). Acciones fijadas a versión mayor oficial (`actions/checkout`, `actions/setup-node`).

- [x] **Paso 1:** escribir el *workflow*.
- [x] **Paso 2:** validar el YAML localmente (parseo) y revisar cada comando contra `package.json`.
- [x] **Paso 3:** commit `ci: run checks and integration tests on an ephemeral Postgres`.
- [ ] **Paso 4 (requiere push, con permiso):** abrir PR y ver la CI en verde. Si el contenedor no trae el certificado *snakeoil*, generar uno en el paso con `openssl`.

### Tarea 4: `verify-db` (regla 0.2 en código)

**Archivos:**
- Crear: `scripts/verify-db-checks.ts` (puro), `scripts/verify-db-checks.test.ts`, `scripts/verify-db.ts` (lee la BD e imprime)
- Modificar: `package.json` (script `db:verify`)

**Interfaces:**
- `type DatabaseSnapshot = { migrationFolders: string[]; appliedMigrations: { name: string; finished: boolean; rolledBack: boolean }[]; tablesWithoutRls: string[]; recordTablesWithoutBroadcast: string[]; publishedAppTables: string[]; realtimeAvailable: boolean; hasTodayPartition: boolean; tenantRoleBypassesRls: boolean | null }`.
- `checkDatabase(snapshot: DatabaseSnapshot): CheckResult[]`, con `type CheckResult = { name: string; status: "pass" | "fail" | "skipped"; detail?: string }`.
- `verify-db.ts` usa `VERIFY_DATABASE_URL` o `DIRECT_URL` y **solo ejecuta `SELECT`**; termina con código 1 si hay algún `fail`.

- [x] **Paso 1 — tests que fallan:**
  - todo correcto → todo `pass`;
  - una migración pendiente o sin carpeta → `fail`;
  - una tabla sin RLS → `fail` con su nombre;
  - una tabla de registros sin *trigger* → `fail`;
  - una tabla publicada → `fail`;
  - `realtimeAvailable: false` → `skipped` en particiones;
  - `tenantRoleBypassesRls: null` → `skipped`.
- [x] **Paso 2:** implementar `checkDatabase` y después el lector SQL (`pg_tables`, `pg_trigger`, `pg_publication_tables`, `pg_inherits` sobre `realtime.messages`, `pg_roles`).
- [x] **Paso 3:** `npm run db:verify` contra producción (**solo lectura**) → todo `pass` o `skipped`.
- [x] **Paso 4:** prueba de mutación de una comprobación; restaurar. Commit `feat(db): verify migrations, RLS and realtime from a script`.

### Tarea 5: lanzamiento manual a producción (decisión 088)

**Archivos:**
- Crear: `vercel.json` (`{"git": {"deploymentEnabled": {"main": false}}}`), `.github/workflows/release.yml`

**Contenido decidido:**
- `on: workflow_dispatch` (input `ref`, por defecto `main`). Jobs encadenados con `needs`:
  1. `migrate-staging` (entorno `staging`): `prisma migrate deploy` + `npm run db:verify`;
  2. `migrate-production` (entorno `production`, con revisores obligatorios en GitHub): lo mismo;
  3. `deploy-production` (entorno `production`): `vercel pull --environment=production`, `vercel build --prod`, `vercel deploy --prebuilt --prod`.
- *Secrets* por entorno (los crea el usuario): `DIRECT_URL`, `DATABASE_CA_CERT`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.

- [x] **Paso 1:** escribir los dos archivos; commit `ci: release to production by hand after migrating and verifying`.
- [ ] **Paso 2 (usuario):** crear los entornos `staging` y `production` en GitHub (revisor obligatorio en `production`), los *secrets* y la protección de `main`.
- [ ] **Paso 3:** primer lanzamiento de prueba sin migraciones nuevas. **Ojo:** al fusionar `vercel.json` en `main`, producción deja de desplegarse sola.

### Tarea 6: proyecto de staging (bloqueada hasta confirmar el coste)

- [x] Crear el proyecto vía MCP (organización Free, **0 $/mes**), región eu-west-3: `nidly-staging`, creado el 2026-10-24.
- [x] `supabase-bootstrap.sql` secciones 1–4 vía MCP. La sección 5 (política de `realtime.messages`) va **después** de la primera migración, porque usa `public.is_household_member`.
- [ ] Usuario: desactivar la Data API en el panel.
- [x] Crear el rol `prisma` según la guía de Supabase, **sin contraseña** (no puede iniciar sesión hasta que el usuario se la asigne con `alter role prisma with password '…'` en el editor SQL).
- [ ] Usuario: SMTP, plantillas con `{{ .Token }}`, OTP de 8 dígitos y las variables `.env` y *Preview* de Vercel.
- [ ] `prisma migrate deploy` + `db:verify` + `test:db` contra staging; `npm test` completo contra staging.
- [ ] Seed sintético multi-familia (tarea separada, con su propio commit).

### Tarea 7: Sentry UE (bloqueada hasta tener la cuenta)

- [ ] Usuario: organización `nidly` en la **región de datos UE** (hecho) y proyecto Next.js; `NEXT_PUBLIC_SENTRY_DSN` en `.env` y Vercel, y `SENTRY_PROJECT` + `SENTRY_AUTH_TOKEN` en Vercel y GitHub para los *source maps*.
- [x] `@sentry/nextjs` **11.6.0** (exacta; `withSentryConfig` viene de `@sentry/nextjs/config` desde la v11): `src/instrumentation.ts` (servidor y *edge*, `onRequestError`), `src/instrumentation-client.ts`, `src/lib/sentry-config.ts`, `sendDefaultPii: false`, sin *tracing*, Replay ni *logs*; `tunnelRoute: "/monitoring"` excluido del *matcher*; `sentryUrl` UE y telemetría del plugin desactivada; *source maps* solo con token y borrados tras subirlos. DSN validado en `public-env.ts`: solo `*.ingest.de.sentry.io`. Errores de `handleActionError` saneados (`sanitizeError`) y de `error.tsx`/`global-error` vía `ErrorState`. Plugin de Sentry para agentes instalado en Cursor.
- [x] Tests de `src/lib/sentry-privacy.ts` (13, con pruebas de mutación de la región y del cuerpo de la petición).
- [x] Error de prueba de punta a punta (2026-10-24, build de producción local): servidor → ingesta UE `200`; navegador → `POST /monitoring?…&r=de` `200` con id de evento, sin ninguna petición directa del navegador a dominios de Sentry.
- [ ] Confirmar los dos eventos en el panel de `nidly` (usuario).

### Tarea 8: sacar los tests de producción (bloqueada: destructiva)

- [ ] Con staging operativo, apuntar `.env` local de tests a staging.
- [ ] **Con confirmación explícita:** `DROP DATABASE baby_tracker_test` en la instancia de producción.

### Tarea 9: rescatar trabajo archivado

- [x] Recuperar el `.gitignore` de `archive/worktree-chore-gitignore-commit-authorship` (ignora `.claude/*` salvo `launch.json` y `skills/`). La regla de autoría ya está en `CLAUDE.md` §0.3.
- [ ] **Arreglo pendiente:** `archive/determined-merkle-a87617` contiene `callAction` y el aviso de «conexión perdida». Hoy, si la red cae durante una Server Action, la app muestra la pantalla de error en vez de un aviso. Se reaplica en su propia rama (`fix/dropped-connection-toast`), rebasada sobre `main`, renumerando su decisión.
- [x] `archive/laughing-keller-bb5a50` (refresco al volver sin conexión) **no se rescata**: `RefreshOnFocus` fue sustituido por `RealtimeSync` (decisión 066), que ya tiene en cuenta la conexión.

### Estado (2026-10-24)

- Hecho: tareas 1–5 (salvo lo que exige push o configuración del usuario), limpieza de ramas (etiquetas `archive/*`), etiqueta `v1.0.0-mvp` y `.gitignore` recuperado.
- **Hotfix desplegado:** `fix/security-patches` subido a `main` (`cff4e4d..59e1449`) con autorización del usuario.
- **Hotfix de seguridad** fuera de plan (rama `fix/security-patches`, también aplicado aquí): Next.js 16.4.0 → 16.4.3 (ejecución remota de código y DoS críticos), Prisma 7.10.1 y Zod 4.6.7; `npm audit` sin vulnerabilidades. Producción sigue en 16.4.0 hasta desplegarlo.
- `db:verify` en producción (solo lectura): todo en verde salvo un **aviso**: aún no existe la partición de hoy de `realtime.messages`, que Realtime crea con la primera conexión del día.
- Bloqueado, a la espera del usuario: crear staging (0 $/mes), push y PR, entornos y *secrets* de GitHub, protección de `main`, cuenta de Sentry UE, borrar `baby_tracker_test` de producción.

**Salida de K0:**
- una PR pasa la CI completa;
- una *Preview* funciona contra staging;
- un lanzamiento recorre staging → aprobación → producción con `verify-db` en verde;
- ningún test toca la instancia de producción;
- los errores llegan a Sentry UE sin datos personales.
