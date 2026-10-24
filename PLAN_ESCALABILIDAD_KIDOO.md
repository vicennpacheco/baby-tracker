# Plan de escalabilidad: de «Métricas Bebé» a Kidoo

> **Estado:** propuesta del 2026-10-24, **pendiente de aprobación**. No se escribe código funcional hasta aprobarla.
> **Autoría:** revisión de arquitectura (Staff) y de producto sobre el MVP desplegado (`main` en `cff4e4d`, Fase 4 cerrada el 2026-10-12).
> **Decisiones asociadas:** 073–084 en [`docs/architecture/decisions.md`](./docs/architecture/decisions.md), todas en estado «Propuesta».

---

## 0. Resumen ejecutivo

El MVP ya tiene la base correcta de un SaaS: datos acotados por familia (`household_id`), RLS en todas las tablas, idempotencia por UUID, concurrencia resuelta en PostgreSQL y sincronización privada por familia. Kidoo no exige reescribirlo. Exige **cuatro cambios de fondo** y **construir encima** en un orden estricto:

1. **Entornos y CI/CD antes que nada** (fase K0). Hoy la única base de datos es la de producción y los tests de integración corren en su misma instancia (decisión 068). Ningún cambio de esquema de Kidoo debería tocar producción sin pasar por staging y CI.
2. **Multi-tenant de verdad** (K1): un usuario en varias familias, roles y, sobre todo, **RLS aplicada también a las consultas del servidor**. Hoy Prisma se salta RLS y toda la protección depende de no olvidar un filtro en el código.
3. **i18n antes de crecer la UI** (K2). Cada pantalla nueva escrita en español duro sería trabajo doble.
4. **IA con privacidad por diseño** (K6–K7). Son datos de salud de menores: Gemini **a través de Vertex AI en la UE**, con consentimiento explícito, sin entrenamiento y con confirmación humana antes de escribir nada.

Orden recomendado: **K0** Fundaciones → **K1** Multi-tenant → **K2** i18n → **K3** Chat → **K4** Percentiles OMS → **K5** Informe PDF → **K6** Asistente IA (texto) → **K7** Voz → **K8** Predicción de sueño → **K9** Monetización y lanzamiento.

**Antes de empezar necesito que decidas cinco cosas** (§15). La más urgente es el **nombre**: «Kidoo» choca con marcas y apps del mismo sector, así que lo trato como nombre en clave hasta verificarlo.

---

## 1. Auditoría del estado actual

### 1.1 Lo que ya está a la altura de un SaaS

| Área | Estado | Evidencia |
|---|---|---|
| Aislamiento por familia | Toda query y action filtra por `householdId` / `babyId` autorizado; lo ajeno responde `NOT_FOUND` | `requireMember`, `assertBabyInHousehold`, decisión 039 |
| Defensa en profundidad | RLS en todas las tablas, solo `SELECT` para miembros, Data API desactivada | Migración `init`, decisiones 014 y 029 |
| Concurrencia | Índices únicos parciales, paradas idempotentes, bloqueo `FOR UPDATE` de la familia | Decisiones 016, 043, 051 y 064 |
| Idempotencia | UUID generado en el cliente; `insertOnce` | Decisión 050 |
| Tiempo real | Broadcast privado por familia, señal sin datos, RLS en `realtime.messages` | Decisión 066 |
| Conexiones | Supavisor en modo transacción (`:6543`) para la app y `DIRECT_URL` solo para la CLI; TLS verificado en producción | Decisiones 012 y 032 |
| Calidad | TypeScript estricto, 545 tests (18 de integración contra Postgres real), pruebas de mutación de las barreras | README, decisiones 037 y 045 |
| PWA | Instalable en iOS y Android, SW que nunca guarda datos de la familia | Decisión 072 |

### 1.2 Deuda y riesgos que bloquean el salto a SaaS

| # | Hallazgo | Impacto | Se resuelve en |
|---|---|---|---|
| R1 | **Un solo proyecto Supabase, y es producción.** No hay dónde probar una migración. | Cualquier migración de Kidoo se probaría sobre datos reales de menores. | K0 (staging) |
| R2 | **`baby_tracker_test` vive en la instancia de producción** (decisión 068), protegido por una guarda de nombre. | Un error en la guarda vaciaría producción (`TRUNCATE … CASCADE`). | K0 (tests en CI y staging) |
| R3 | **Sin CI.** Typecheck, lint y tests solo corren en local; `main` despliega producción directamente en Vercel. | Un commit roto llega a producción. | K0 |
| R4 | **Prisma se salta RLS** (rol `prisma` con `BYPASSRLS`). | La seguridad depende de que ningún desarrollador olvide un `where`. Aceptable con 2 usuarios; no con miles de familias. | K1 (decisión 078) |
| R5 | **Un usuario = una familia** (`household_members.user_id` único, decisión 031) y máximo 2 miembros. | Excluye a padres separados, abuelos y cuidadores. | K1 (decisión 077) |
| R6 | **Zona horaria global** (`APP_TIMEZONE`). | Una familia fuera de España vería mal «hoy». | K1 |
| R7 | **Textos de UI en español dentro del código.** | Traducir después de seguir creciendo cuesta el doble. | K2 |
| R8 | **Ramas y *worktrees* obsoletos:** `claude/determined-merkle-a87617` (3 commits sin integrar), `claude/laughing-keller-bb5a50` (2) y `worktree-chore-gitignore-commit-authorship` (1), todos del 2026-10-09 y 32–72 commits por detrás. | Ruido y riesgo de integrar trabajo ya sustituido (decisiones renumeradas). | K0 (revisar y archivar) |
| R9 | **Sin observabilidad de errores en producción** (por la regla de «ningún tercero», §5). | En un SaaS no sabríamos que algo falla hasta que un usuario lo cuente. | K0 (decisión pendiente, §15) |
| R10 | **Planes gratuitos o personales.** Vercel Hobby **no admite uso comercial**. Supabase Free pausa proyectos inactivos y no incluye copias PITR. | Un SaaS de pago no puede operar así. | K9 (antes de cobrar), K0 para staging |
| R11 | `babies` no tiene `updated_by_id` y el otro móvil no recibe señal al eliminar la familia. | Limitaciones aceptadas en la 071. | K1 |
| R12 | Lighthouse e iconos definitivos pendientes. | Calidad percibida. | K2 (marca) / K9 |

---

## 2. Estrategia de Git (decisión 074)

**Recomendación: trunk-based con PR obligatorias y *feature flags*.** Se descartan GitFlow (`develop` + `release/*`) y una rama `kidoo` de larga vida.

- **Por qué no una rama `kidoo` larga:** el esquema de producción seguiría evolucionando en `main` y la rama acumularía migraciones con marcas de tiempo cruzadas. Prisma Migrate aplica las migraciones por orden y fusionarlas tarde produce *drift*.
- **Por qué *flags*:** permiten fusionar en `main` cada paso pequeño de Kidoo (por ejemplo, la tabla del chat) sin enseñarlo a los usuarios. Se apagan en producción y se encienden en staging o para familias *beta*.

### 2.1 Reglas

1. `main` = siempre desplegable a producción. **Protegida:** solo PR, CI en verde obligatoria y sin *force push*.
2. Ramas cortas (≤ 3 días) desde `main`: `feat/<ámbito>-<tema>`, `fix/…`, `docs/…`, `chore/…`, `db/…` (para migraciones que van solas, ver §4.3).
3. Fusión con **«Rebase and merge»**: historial lineal y commits atómicos en Conventional Commits, como hasta ahora.
4. **Una migración por PR** y nunca dos PR abiertas con migraciones a la vez. Si ocurre, la segunda se rebasa y se regenera la marca de tiempo antes de fusionar.
5. Etiquetas semánticas: `v1.0.0-mvp` sobre `cff4e4d` (estado del MVP, punto de restauración) y después `v1.x` por fase de Kidoo cerrada.
6. *Feature flags* en dos niveles:
   - por entorno, con variables validadas en `env.ts` (`FEATURE_CHAT`, `FEATURE_AI`…);
   - por familia, con `household_feature_overrides` para *beta testers* (K1).

### 2.2 Limpieza (K0, con tu confirmación)

- Revisar los 6 commits sin integrar de las tres ramas obsoletas (R8). Todo apunta a que fueron sustituidos al renumerar las decisiones 056, 062 y 063. Después, archivar con etiquetas `archive/<rama>` y borrar ramas y *worktrees*.
- Esta iteración de documentación ya vive en la rama `docs/kidoo-vision`, no en `main`.

---

## 3. Estrategia de entornos y bases de datos (decisión 075)

### 3.1 Entornos

| Entorno | Supabase | Vercel | Datos | Quién migra |
|---|---|---|---|---|
| **local** | proyecto `staging` (no hay Docker en esta máquina; ver 3.3) | `npm run dev` | de prueba | nadie: solo `migrate dev` contra la BD `kidoo_dev` de staging |
| **ci** | Postgres 17 efímero (contenedor de servicio de GitHub Actions) + `shadow-stubs.sql` | — | creados por cada test | CI, en cada ejecución |
| **staging** | **proyecto nuevo** `kidoo-staging`, eu-west-3 | *Preview* de cada PR | seed sintético | CI, automático al fusionar en `main` |
| **production** | proyecto actual (decisión 068) | *Production* (`main`) | reales | CI, tras **aprobación manual** |

### 3.2 Por qué un proyecto de staging y no Supabase Branching

Según la documentación de Supabase, las ramas (de *preview* o persistentes) se crean **sin datos**, se cobran por horas de cómputo y su flujo de despliegue aplica **las migraciones de la CLI de Supabase** (`supabase/migrations`). Nuestro esquema lo gestiona **Prisma Migrate** (regla 0.2), así que una rama obligaría a mantener dos historiales de migraciones o a ejecutar `prisma migrate deploy` a mano contra cada rama.

Un proyecto de staging es más simple, más barato de razonar y repite exactamente el camino de producción: `supabase-bootstrap.sql` → `prisma migrate deploy` → `verify-db`. **Branching se reevalúa** si algún día el equipo crece y se quieren BD por PR.

### 3.3 Base de datos de tests

- **CI:** cada ejecución levanta `postgres:17` como contenedor de servicio, carga `prisma/platform/shadow-stubs.sql` (los mismos *stubs* que la base de datos temporal de Prisma) y aplica las migraciones. Los tests de integración, incluidos los nuevos de aislamiento entre familias (§6.6), corren ahí, sin red hacia Supabase.
- **Local:** `kidoo_test` dentro del proyecto **staging**, con la guarda de las decisiones 037 y 038. `baby_tracker_test` desaparece de la instancia de producción. Se borra con tu confirmación explícita (regla 0.2).
- **Docker local:** opcional. Si lo instalas, `supabase start` daría un entorno 100 % local; el plan no depende de ello.

### 3.4 Datos de staging

El seed se reescribe como **datos sintéticos multi-familia**: 3 familias, 2 bebés con historial de 60 días, un prematuro y un usuario en dos familias. Nunca se copian datos de producción a staging: son datos de salud de menores.

### 3.5 Pasos manuales que tienes que hacer tú (los secretos nunca pasan por Claude)

1. Crear el proyecto Supabase `kidoo-staging` en eu-west-3 (o autorizarme a crearlo vía MCP tras confirmar el coste).
2. Configurar en él el SMTP, las plantillas con `{{ .Token }}` y la longitud del OTP en 8, como en producción.
3. Introducir en Vercel las variables del entorno *Preview* (staging) y en GitHub los *secrets* de los entornos `staging` y `production` (`DIRECT_URL_*`).

---

## 4. CI/CD (decisión 076)

### 4.1 Pipeline de cada PR (`.github/workflows/ci.yml`)

```
checkout → setup Node 24 → npm ci (incluye prisma generate)
  ├─ format:check · lint · typecheck            (en paralelo)
  ├─ test:unit
  ├─ db: postgres:17 service → shadow-stubs.sql → prisma migrate deploy → test:int
  ├─ prisma migrate diff --from-migrations … --to-schema-datamodel … --exit-code   (sin drift)
  └─ next build
```

Vercel crea a la vez la *Preview* con las variables de staging. Como el login es por código OTP, no hace falta registrar URLs de redirección por cada *preview*.

### 4.2 Pipeline de despliegue de base de datos (`db-deploy.yml`)

```
push a main con cambios en prisma/migrations
  → job "staging"     : prisma migrate deploy (DIRECT_URL_STAGING) → scripts/verify-db.ts
  → job "production"  : environment: production (aprobación manual) → migrate deploy → verify-db
```

`scripts/verify-db.ts` convierte en código las comprobaciones de la regla 0.2:
- `_prisma_migrations` sin fallos y alineada con las carpetas;
- RLS activado en todas las tablas de `public` y políticas esperadas;
- el *trigger* `broadcast_household_change` en cada tabla de registros y en el chat;
- ninguna tabla en `supabase_realtime`;
- particiones de `realtime.messages` para hoy;
- `app_tenant` sin `BYPASSRLS`.

Claude sigue verificando además vía MCP y revisando los *advisors* tras cada cambio de esquema.

### 4.3 Orden de despliegue: *expand → migrate → contract*

Vercel despliega `main` en cuanto se fusiona y la migración de producción espera una aprobación, así que **el código nuevo puede llegar antes que el esquema nuevo**. Regla: toda migración es compatible con el código anterior y con el siguiente.

1. **Expand** (PR `db/…`): añadir columnas o tablas nullable o con valor por defecto, y quitar restricciones que el código nuevo ya no necesita. Se fusiona y se migra.
2. **Migrate** (PR `feat/…`): el código empieza a usar lo nuevo y, si hace falta, un *backfill* idempotente.
3. **Contract** (PR `db/…` posterior): `NOT NULL`, borrar lo antiguo y restricciones nuevas.

Alternativa más estricta, si la prefieres: desactivar el despliegue automático de producción en Vercel y promoverlo desde GitHub Actions después de migrar.

### 4.4 Otros

- Dependabot semanal solo para parches de seguridad. Prisma se mantiene fijado en 7.x (decisión 008).
- Rama `main` protegida y `CODEOWNERS` para `prisma/**` y `src/features/auth/**`.

---

## 5. Arquitectura objetivo

```
  Navegador / PWA (es, en…)                Vercel (región cdg1)                         Supabase UE (eu-west-3)
  ─────────────────────────                ─────────────────────                        ───────────────────────
  Client Components ──Server Actions──▶  requireMember → Zod → withTenant ──6543──▶  PostgreSQL
  (registro, chat, IA)                    (SET LOCAL ROLE app_tenant + claims)        RLS aplicada a TODO
        ▲                                 Server Components (queries)                 (app_tenant / authenticated)
        │ RSC/HTML ◀──────────────────────┘                                                │ triggers
        │                                 next-intl (locale del perfil/cookie)              ▼
  RealtimeSync ◀── WebSocket privado household:<id> ◀────────────────────────── Realtime Broadcast ({table, op})
        │
        │ audio/texto ──▶ Server Action "assistant" ──▶ Vertex AI (Gemini, europe-*) ── salida estructurada
        │                     │  herramientas de solo lectura (withTenant)          (validada con Zod)
        │                     └─ pgvector (corpus curado)                    ──▶ tarjeta de confirmación ──▶ Server Action normal
        │
  /r/<token> (público) ──▶ Route Handler ──▶ Storage privado (informes PDF, URL firmada de 60 s)

  GitHub Actions: CI en cada PR · migrate deploy staging → (aprobación) → production · verify-db
```

**Principios que no cambian:**
- PostgreSQL es la única fuente de verdad y Realtime solo invalida.
- Todas las escrituras entran por Server Actions con Zod.
- Fechas en UTC; los días se calculan en la zona de la familia.
- Medidas como enteros.
- El SW nunca guarda datos.
- Pantallas en lugar de modales.

---

## 6. Arquitectura SaaS multi-tenant (decisiones 077 y 078)

### 6.1 Modelo de *tenancy*

- **Tenant = familia (`households`).** Es el modelo correcto para B2C: la familia es quien comparte datos y, en K9, quien paga.
- **Esquema compartido, columna de *tenant* y RLS.** Se descartan un esquema o una base de datos por *tenant*: no escalan a miles de familias pequeñas y multiplican las migraciones.
- Los registros cuelgan de `babies.household_id`. Las tablas nuevas que no son del bebé (chat, consentimientos, uso de IA, suscripciones) llevan `household_id` directo.

### 6.2 Usuarios en varias familias

- `household_members`: `UNIQUE (household_id, user_id)` en lugar de `UNIQUE (user_id)`, más índice `(user_id, household_id)`.
- **Familia activa:** cookie `kidoo-household` con el id. El servidor la valida en cada petición dentro de `requireMember()`; si no es válida o falta, usa la primera familia. Nunca se confía en ella sin comprobar la pertenencia.
- Selector de familia en «Más» (y en «Hoy» si hay más de una). Cambiar de familia escribe la cookie con una Server Action y redirige a `/`.
- `requireMember()` pasa a devolver `{ userId, householdId, role }`, y `RealtimeSync` se suscribe al canal de la familia activa.

### 6.3 Roles

| Rol | Registrar | Editar o borrar registros | Gestionar bebés | Invitar o expulsar | Eliminar familia | Chat | IA |
|---|---|---|---|---|---|---|---|
| `OWNER` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ (activa el consentimiento) |
| `MEMBER` | ✓ | ✓ | ✓ | invitar | — | ✓ | ✓ |
| `CAREGIVER` | ✓ | solo los suyos | — | — | — | ✓ | — |
| `VIEWER` | — | — | — | — | — | ✓ | — |

- La matriz vive en `features/household/permissions.ts` (pura y testeada) **y** en las políticas RLS (§11.2).
- La invitación elige el rol al generarse.
- El límite de miembros pasa a depender del plan (K9).

### 6.4 RLS aplicada al servidor: `withTenant`

**Problema:** el rol `prisma` tiene `BYPASSRLS`, de modo que RLS solo protege Realtime y la Data API (desactivada).

**Solución** (patrón documentado por Prisma para RLS con *client extensions*, adaptado al pooler en modo transacción):

```ts
// src/lib/tenant-db.ts — boceto, NO se implementa hasta aprobar (K1)
export async function withTenant<T>(
  member: { userId: string },
  fn: (tx: TenantTx) => Promise<T>,
): Promise<T> {
  return db.$transaction(async (tx) => {
    const claims = JSON.stringify({ sub: member.userId, role: "authenticated" });
    await tx.$executeRaw`SELECT set_config('request.jwt.claims', ${claims}, true)`;
    await tx.$executeRaw`SET LOCAL ROLE app_tenant`;
    return fn(tx);
  });
}
```

- `set_config(…, true)` y `SET LOCAL` solo duran la transacción, así que son seguros con Supavisor en modo transacción: la conexión vuelve limpia al pool.
- **`app_tenant` y no `authenticated`:** las escrituras se conceden a un rol `NOLOGIN` que solo el servidor puede adoptar. Si algún día alguien reactivase la Data API, un JWT de navegador (`authenticated`) seguiría sin poder escribir.
- **`systemDb`** (el cliente actual, con `BYPASSRLS`) queda para una **lista cerrada** comprobada por ESLint (`no-restricted-imports` fuera de los archivos permitidos):
  - alta de familia (aún no hay pertenencia);
  - canje de invitación;
  - eliminación de cuenta;
  - trabajos programados;
  - `insertOnce` cuando tenga que distinguir «id ajeno» de «reintento» (decisión 050).
- **Coste:** dos sentencias extra por transacción, en el mismo viaje a la base de datos si se agrupan. Se mide en K1 con `EXPLAIN ANALYZE` y la latencia p95 de «Hoy». Objetivo: menos de 10 ms extra.
- **La autorización en código se mantiene** (`requireMember`, `assertBabyInHousehold`): la BD es la red de seguridad, no el único control, y los mensajes de error (`NOT_FOUND`, `CONFLICT`) siguen saliendo del código.

### 6.5 Pooling de conexiones

- Se mantiene Supavisor en modo transacción para la app y en modo sesión (o conexión directa) para la CLI.
- `PrismaPg` con un pool pequeño por instancia (`max` 3–5) y `idleTimeoutMillis` corto, porque las funciones de Vercel escalan horizontalmente. Se dimensiona con `pg_stat_activity` y el límite de clientes del pooler del plan.
- **Sin sentencias preparadas con nombre** (`?pgbouncer=true`), compatibles con el modo transacción.
- Lecturas pesadas (informes, predicción por lotes): fuera del camino interactivo y en horas valle (K5 y K8).

### 6.6 Pruebas de aislamiento entre familias (obligatorias en K1)

Suite de integración en CI que, para **cada tabla** × **cada operación** × **cada rol** × {misma familia, otra familia}, ejecuta la consulta **solo con RLS**, saltándose las comprobaciones del código, y verifica el resultado esperado. Cada política recibe su prueba de mutación (§3.5 de `CLAUDE.md`).

---

## 7. Internacionalización (decisión 079)

### 7.1 Diseño

- **`next-intl`** (dependencia nueva; resuelve mensajes con ICU, formato y carga por idioma en Server Components; Next.js no trae i18n para App Router). Hay que verificar en la instalación su compatibilidad con Next 16.4, Cache Components y React 19 (regla 0.4).
- **Sin prefijo de idioma en las rutas de la app** (configuración «without i18n routing»). Motivos:
  - la PWA instalada abre `start_url: "/"`;
  - el *service worker* y el *matcher* del proxy no dependen de prefijos;
  - la app autenticada no necesita SEO.
- **Resolución del idioma:** `profiles.locale` → cookie `NEXT_LOCALE` → `Accept-Language` → `es`. Con Cache Components, el idioma es un dato dinámico: se lee dentro de `<Suspense>` como las cookies (decisión 021) o se pasa a cada *shell* por un segmento.
- **Mensajes:** `messages/<locale>/<feature>.json` con claves en inglés (`feeding.actions.save`). En el servidor, `getTranslations`; en las islas cliente, `useTranslations`, enviando solo el espacio de nombres de la isla.
- **Fechas:** `src/lib/dates.ts` recibe el *locale* de date-fns activo (`es`, `enUS`…) además de la zona de la familia. El formato de 24 h o 12 h sigue al *locale*.
- **Unidades:** `profiles.measurement_system` (`METRIC` · `IMPERIAL`). La conversión (lb/oz, in, fl oz) solo ocurre en la presentación y en los esquemas de entrada; la BD sigue en g, mm y ml.
- **Zona horaria por familia:** `households.time_zone` (IANA, validada con `Intl.supportedValuesOf('timeZone')`). Los esquemas paramétricos de la decisión 049 ya la reciben.
- **Textos de Zod:** mapa de errores por idioma (`z.config({ customError })` o mensajes por clave), sin duplicar esquemas.
- **Idiomas al lanzar:** `es` y `en`. Después, según mercado (pt-BR, fr, de). Traducción profesional con revisión médica de la terminología.

### 7.2 Migración del código existente

Se hace por módulo, en PR pequeñas, sin cambiar comportamiento:
1. Extraer los textos de `labels.ts`, componentes, avisos y mensajes de error a JSON en español.
2. Test que falla si una clave existe en `es` y no en `en`.
3. Regla de ESLint (`no-restricted-syntax` sobre literales JSX en `features/**/components`) para evitar regresiones.

En esta fase el nombre de la app pasa a ser un mensaje (`app.name`) y el manifiesto se sirve por idioma.

---

## 8. Chat familiar (decisión 080)

### 8.1 Diseño

- **Tabla `household_messages`:**
  - `id` (UUID del cliente, idempotente con `insertOnce`), `household_id`, `author_id`, `body` (1–2000 caracteres);
  - `created_at`, `updated_at`, `edited_at`, `deleted_at` (borrado lógico: se pinta «Mensaje eliminado» para no romper el hilo).
- **Escritura:** `sendMessage`, `editMessage` y `deleteMessage` (Server Actions, `withTenant`).
- **Lectura:** `listMessages(householdId, { before?: cursor, limit: 50 })` por `(household_id, created_at DESC, id DESC)`.
- **Tiempo real:** *trigger* `broadcast_household_change` con una función nueva que lee `household_id` de la propia fila. El cliente recibe `{table: 'household_messages', op}` y refresca **solo el segmento del chat**. Nunca pinta el contenido llegado por el socket: la regla 2.8 se mantiene.
- **Leídos:** `household_message_reads(household_id, user_id, last_read_at)` y un globo de no leídos en la barra inferior.
- **UI:** pantalla `/chat` dentro de `(tabs)` (o en «Más» si la barra no admite un sexto destino: decisión de diseño en K3). Envío optimista con `useOptimistic` y reintento con el mismo UUID. Sin conexión, el campo se deshabilita (§2.8).
- **Notificaciones Web Push** (K3b, opcional):
  - iOS solo las admite en PWA instaladas;
  - requiere claves VAPID y la dependencia `web-push`, o una Edge Function;
  - el aviso dice «Mensaje nuevo en Kidoo», **sin el contenido**, porque puede contener datos de salud.
- **Retención:** configurable por familia (por defecto, indefinida). Se exporta con los datos de la familia (§13).

### 8.2 Por qué no enviar el mensaje por el socket

Sería más rápido en unos milisegundos, pero:
- pondría datos de salud en tránsito por un segundo camino;
- obligaría a reconciliar el estado local con el servidor;
- rompería la fuente única de verdad.

Con familias de 2 a 6 personas, `router.refresh()` acotado al segmento del chat cumple de sobra el objetivo de menos de 2 s.

---

## 9. Asistente IA (decisiones 081 y 082)

### 9.1 Proveedor y privacidad

- **Vercel AI SDK** (`ai`) + **`@ai-sdk/google-vertex`**: Gemini **en Vertex AI**, con `location` fijada a una región UE (por ejemplo `europe-west1`, o `europe-southwest1` en Madrid si el modelo está disponible ahí). **No se usa la Gemini Developer API (AI Studio):** procesa los datos de forma global y su capa gratuita puede usarlos para mejorar los modelos.
- **Proyecto de Google Cloud con facturación, DPA firmado** (Cloud Data Processing Addendum), compromiso de no entrenamiento y retención cero si está disponible para el modelo elegido. **Todo esto se verifica en los términos vigentes de Google antes de K6**, porque las fuentes secundarias no coinciden en algunos puntos.
- **Consentimiento explícito por familia** (`ai_consents`):
  - lo activa el OWNER, con texto claro de qué datos salen y hacia dónde;
  - revocable en cualquier momento;
  - versionado (`policy_version`).
- **Minimización:**
  - al modelo solo llegan los datos que piden las herramientas;
  - nunca nombres de miembros ni email; el bebé se identifica como «el bebé» con su edad;
  - **no se guardan transcripciones** (las conversaciones viven en la memoria del cliente);
  - `ai_interactions` registra metadatos (tipo, modelo, tokens, resultado), nunca contenido.
- **Sin consejo médico:**
  - el asistente resume, registra y explica los datos de la familia, y deriva al pediatra ante síntomas;
  - prompt de sistema con límites explícitos y evaluación de esos límites (§9.6);
  - etiqueta visible «IA» en cada respuesta (transparencia del Reglamento de IA de la UE).

### 9.2 Contexto del bebé: herramientas antes que RAG vectorial

Los datos del bebé son **estructurados**: buscarlos por similitud vectorial sería impreciso y caro. El contexto se inyecta con **herramientas de solo lectura** que el servidor ata al bebé autorizado:

| Herramienta | Devuelve |
|---|---|
| `getDaySummary({ date })` | El `DailySummary` existente |
| `getRecentRecords({ kind, days ≤ 14 })` | Registros resumidos (hora, tipo, cantidades) |
| `getGrowthTrend()` | Últimas medidas y percentiles (cuando exista K4) |
| `getSleepPattern({ days ≤ 14 })` | Ventanas de vigilia y sueño (K8) |

- El modelo **no elige** familia ni bebé: el servidor fija el `babyId` antes de exponer las herramientas, y cada una ejecuta `withTenant`.
- **RAG con `pgvector`** solo donde aporta:
  1. **corpus curado de guías** (fuentes públicas con licencia compatible, versionado, revisado por un profesional), para respuestas generales con cita;
  2. **(opcional, más adelante)** notas libres y chat de la familia, solo con consentimiento específico.
- Embeddings multilingües de Vertex, `vector(768)` e índice HNSW (§11.6).

### 9.3 Registro por lenguaje natural: salida estructurada

```
"le he dado 120 de fórmula hace 10 min y ha hecho caca"
  → Server Action parseRecords(text)
  → generateObject / Output.object (la API de salida estructurada de la versión instalada del AI SDK)
       schema = z.object({ records: z.array(z.discriminatedUnion("kind", [
         feedingDraft, diaperDraft, sleepDraft, growthDraft, healthDraft ])) })
  → cada borrador se valida con los MISMOS esquemas Zod de las actions (diaperChangeSchemas(timeZone)…)
  → UI: tarjetas «He entendido: Biberón 120 ml de fórmula · 14:10» [Guardar] [Corregir] [Descartar]
  → Guardar = las Server Actions de siempre (createFeeding…), con su UUID, idempotencia y autoría
```

- **El modelo nunca escribe en la BD.** La confirmación humana neutraliza alucinaciones e **inyección de instrucciones** (por ejemplo, un texto del chat que dijera «borra todo»).
- Las horas relativas («hace 10 min») las resuelve **el servidor**, como en la decisión 062. El modelo devuelve `minutesAgo` o una hora local, nunca una marca UTC inventada.
- Lo ambiguo vuelve como pregunta, no como suposición. Por ejemplo, «¿pecho izquierdo o derecho?» con botones.

### 9.4 Voz (decisión 082)

- `MediaRecorder` en la PWA (AAC/MP4 en iOS, WebM/Opus en Android), con un máximo de 30 s y un botón grande de mantener o tocar.
- Se envía a una Server Action con `FormData` y límite de tamaño explícito (se ajusta `serverActions.bodySizeLimit` o se usa un Route Handler).
- Gemini multimodal transcribe y extrae en una sola llamada, con el mismo esquema que en §9.3.
- **El audio no se guarda.** Si falla, el usuario repite.
- La alternativa Web Speech API se descarta: no está disponible de forma fiable en todos los navegadores móviles y en Safari depende de servidores de Apple.

### 9.5 Costes y abuso

- `ai_usage(household_id, day, requests, input_tokens, output_tokens)` con límites diarios por plan. Se comprueban **antes** de llamar al modelo, bajo `SELECT … FOR UPDATE` o con un `UPDATE … RETURNING` atómico.
- Modelo «Flash» por defecto, caché de contexto si el proveedor la ofrece y `maxOutputTokens` acotado.
- Límite por usuario y minuto en la BD, sin dependencias nuevas.

### 9.6 Evaluación

- **Conjunto de oro** (`src/features/assistant/evals/*.json`): unas 200 frases en `es` y `en` (con jerga, errores y horas relativas), cada una con los registros esperados.
- Se ejecuta bajo demanda y cada noche en staging, no en cada PR, por coste. Métrica: exactitud por campo ≥ 95 % antes de abrir la beta.
- **Pruebas adversariales:** inyección de instrucciones en notas y chat, peticiones de diagnóstico y otra familia.

---

## 10. Investigación de mercado y tres funcionalidades nuevas (decisión 083)

### 10.1 Panorama

| Producto | Fortalezas | Modelo |
|---|---|---|
| **Huckleberry** (líder en EE. UU.) | Registro completo y gratuito con multi-cuidador; **SweetSpot** (predicción de la hora ideal de sueño desde los 2 meses) solo en la suscripción; informes; registro con IA y chat con guía en el plan superior | Freemium: Plus en torno a 59 $/año y Premium en torno a 120 $/año según paywalls observados; varía por país |
| Trackers genéricos de App Store (Baby Tracker – Newborn, BabyTrack, Biguma, Aiko…) | **Percentiles OMS** y **exportación PDF para el pediatra** como función habitual | Freemium con compras integradas |
| Apps de desarrollo y consejo (Kidooo AI, Kinedu…) | Evaluaciones del desarrollo y «asesor IA» | Suscripción |

**Conclusiones:**
1. Registro, sincronización, percentiles e informes son **lo mínimo que se espera** (*table stakes*).
2. Se diferencia quien **predice** (sueño) y quien **reduce la fricción del registro** (IA y voz).
3. **Hueco para Kidoo:** tiempo real de verdad entre cuidadores, registro por voz o texto con confirmación, privacidad europea (datos en la UE, IA sin entrenamiento) y multilingüe desde el diseño.

*Fuentes al final del documento. Precios y funciones de terceros según fichas y paywalls públicos, sujetos a cambio.*

### 10.2 Funcionalidad 1: curvas de percentiles OMS con edad corregida (K4)

- **Valor:** responde a «¿está creciendo bien?» con la misma referencia que usa el pediatra. Es imprescindible para competir.
- **Datos:**
  - tabla `growth_reference_lms` con los parámetros **L, M, S** por sexo, indicador (peso, longitud y perímetro craneal para la edad) y día de edad (0–1856, Patrones de Crecimiento Infantil OMS 2006);
  - se carga con un script idempotente (`npm run reference:load`) en cada entorno tras `migrate deploy`.
  - **Licencia por verificar:** los materiales de la OMS suelen publicarse con licencia no comercial. Antes de K4 hay que confirmar el permiso de uso comercial o pedirlo.
- **Cálculo** (`features/growth/percentiles.ts`, puro y testeado contra los valores publicados):
  - z = ((x / M)^L − 1) / (L · S);
  - percentil = Φ(z);
  - tratamiento de |z| > 3 según el método restringido de la OMS.
- **Edad corregida:** si `babies.gestational_age_weeks` < 37, se usa edad − (40 − semanas) hasta los 24 meses.
- **Sexo:** obligatorio para la curva. Si es «Prefiero no decirlo» (decisión 069), se explica que hace falta y se ofrece indicarlo.
- **UI:** gráfica **SVG propia** (curvas P3–P97 y puntos del bebé), accesible (tabla equivalente para lectores de pantalla), en modo claro y oscuro. Sin librería de gráficas: es una sola gráfica de líneas con escala fija.
- **Escalado:** la tabla de referencia ocupa ~11 000 filas, es inmutable y se puede cachear con `"use cache"` porque no son datos de usuario. El cálculo por bebé es O(medidas). Sin coste de infraestructura.

### 10.3 Funcionalidad 2: informe para el pediatra (PDF y enlace temporal) (K5)

- **Valor:** convierte semanas de registros en una página que el pediatra lee en un minuto: tomas y ml por día, pañales, sueño total y nocturno, curvas, vacunas y medicamentos con reacciones, y notas.
- **Generación:**
  - Route Handler de exportación (`/api/reports/[id]`, permitido por la regla 2.2);
  - `@react-pdf/renderer` (dependencia nueva: PDF en el servidor sin navegador *headless*, viable en funciones de Vercel). Se verifica su compatibilidad con React 19 en la instalación;
  - plantillas traducidas (K2) y gráficas SVG de K4 reutilizadas.
- **Almacenamiento y entrega:**
  - bucket **privado** `reports` en Supabase Storage (creado en el *bootstrap*, porque `prisma` no gestiona `storage`);
  - `report_exports` guarda estado, rango y ruta;
  - **enlace para compartir:** `report_share_links` con token aleatorio del que solo se guarda el hash (como la ADR-043), caducidad de 7 días por defecto y revocable;
  - `/r/<token>` (público, excluido del *matcher* del proxy, con límite de intentos) valida el token y redirige a una **URL firmada de Storage de 60 s**.
- **Escalado:**
  - rangos de hasta 3 meses se generan en línea;
  - rangos mayores, o en picos, pasan a una cola (`pgmq` de Supabase Queues o Vercel Queues/Workflow, a decidir en K5) con estado `PENDING → READY` y aviso por Realtime;
  - caché por `(baby_id, rango, versión de datos)`;
  - limpieza diaria de informes caducados con `pg_cron` o Vercel Cron.

### 10.4 Funcionalidad 3: predicción de ventanas de sueño (K8)

- **Valor:** es la función de pago estrella del líder del mercado. Responde a «¿cuándo intento dormirlo?» a las 4 de la tarde con el bebé irritable.
- **V1, heurística explicable** (sin tabla nueva):
  - `features/sleep/prediction.ts` (pura) combina:
    - **ventanas de vigilia** de referencia por edad (tabla en código, revisada por un profesional y con fuente citada);
    - la **mediana personal** de las ventanas de vigilia de los últimos 7 días a esa hora del día;
  - devuelve un intervalo («entre 16:10 y 16:40») y su explicación («suele aguantar 1 h 50 min despierto por la tarde»);
  - se calcula al leer, O(sesiones de 7 días), con índice existente.
- **V2, modelo por bebé** (cuando haya datos suficientes):
  - regresión de cuantiles o modelo de supervivencia sobre el historial de cada bebé;
  - se calcula **por lotes** cada noche (`pg_cron` + Edge Function, o Vercel Cron + Route Handler protegido) y se guarda en `sleep_predictions`;
  - el coste es O(bebés activos) por noche y se reparte por familia en tandas.
  - **Evaluación previa:** error absoluto medio de la hora predicha frente a la real en datos de staging y beta.
- **Límites:**
  - informativo, nunca diagnóstico; sin alertas de «riesgo»;
  - texto «Sugerencia basada en sus registros»;
  - revisión regulatoria (§13.2) antes de publicar la V2.

### 10.5 Candidatas que no entran en esta tanda

- **Recordatorios push** (próxima toma o dosis): muy valorados, pero dependen del Web Push de K3b. Van en una fase posterior.
- **Diario de hitos con fotos:** exige almacenamiento de imágenes y moderación. Se descarta por ahora.
- **Escritura sin conexión:** el diseño con UUID del cliente ya la prepara. Coste alto en iOS. Se aplaza.

---

## 11. Migraciones SQL (borradores)

> **Borradores para revisar, no para ejecutar.** Cada migración real se genera con `prisma migrate dev --create-only` contra la BD de **staging o desarrollo** a partir de los cambios en `schema.prisma`, y se le añade a mano el SQL que Prisma no modela (RLS, políticas, *grants*, *triggers*), igual que hasta ahora (§2.6). Lo que exige privilegios de `postgres` va al *bootstrap* (decisión 027). Nombres en `snake_case`; una migración por PR (§2.1).

### 11.1 K1-a · `multi_household_membership` (expand)

```sql
-- Generado por Prisma a partir de schema.prisma ──────────────────────────────
ALTER TYPE "HouseholdRole" ADD VALUE 'CAREGIVER';
ALTER TYPE "HouseholdRole" ADD VALUE 'VIEWER';
CREATE TYPE "MeasurementSystem" AS ENUM ('METRIC', 'IMPERIAL');

DROP INDEX "household_members_user_id_key";                       -- deja de ser 1 familia por usuario (031)
CREATE UNIQUE INDEX "household_members_household_id_user_id_key"
  ON "household_members" ("household_id", "user_id");
CREATE INDEX "household_members_user_id_household_id_idx"         -- lo usan las funciones de RLS (§11.2)
  ON "household_members" ("user_id", "household_id");

ALTER TABLE "households"
  ADD COLUMN "time_zone" TEXT NOT NULL DEFAULT 'Europe/Madrid';   -- sustituye a APP_TIMEZONE (077)
ALTER TABLE "household_invites"
  ADD COLUMN "role" "HouseholdRole" NOT NULL DEFAULT 'MEMBER';

ALTER TABLE "babies"
  ADD COLUMN "gestational_age_weeks" SMALLINT,                    -- edad corregida (K4)
  ADD COLUMN "updated_by_id" UUID;                                -- autoría de ediciones (R11)

CREATE TABLE "profiles" (
  "user_id"            UUID PRIMARY KEY,                          -- auth.users.id, sin FK (031)
  "locale"             TEXT NOT NULL DEFAULT 'es',
  "measurement_system" "MeasurementSystem" NOT NULL DEFAULT 'METRIC',
  "created_at"         TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
  "updated_at"         TIMESTAMPTZ(3) NOT NULL
);

CREATE TABLE "household_feature_overrides" (                      -- flags beta por familia (§2.1)
  "household_id" UUID NOT NULL REFERENCES "households"("id") ON DELETE CASCADE,
  "flag"         TEXT NOT NULL,
  "enabled"      BOOLEAN NOT NULL,
  "created_at"   TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
  "updated_at"   TIMESTAMPTZ(3) NOT NULL,
  PRIMARY KEY ("household_id", "flag")
);

-- Añadido a mano ──────────────────────────────────────────────────────────────
ALTER TABLE "babies" ADD CONSTRAINT "babies_gestational_age_plausible"
  CHECK ("gestational_age_weeks" IS NULL OR "gestational_age_weeks" BETWEEN 22 AND 44);
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_locale_supported"
  CHECK ("locale" IN ('es', 'en'));                               -- se amplía con cada idioma
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "household_feature_overrides" ENABLE ROW LEVEL SECURITY;
-- La zona horaria se valida en Zod contra Intl.supportedValuesOf('timeZone'): un CHECK
-- que consulte pg_timezone_names no sería inmutable.
```

**Compatibilidad:** el código del MVP sigue funcionando mientras nadie tenga dos familias. La UI para unirse a una segunda familia se activa con un *flag* después de desplegar el código nuevo (*expand → migrate*).

### 11.2 K1-b · `tenant_rls_enforcement`

**Bootstrap** (como `postgres`, una vez por proyecto; se añade a `supabase-bootstrap.sql` §6 y a `shadow-stubs.sql`):

```sql
create role app_tenant nologin noinherit;           -- sin BYPASSRLS: es el rol de las peticiones de usuario
grant app_tenant to prisma;                          -- prisma puede hacer SET LOCAL ROLE app_tenant
grant usage on schema private to app_tenant;
grant execute on function private.auth_uid() to app_tenant;
```

**Migración** (las funciones las crea y posee `prisma`, que tiene `BYPASSRLS`, así que pueden leer `household_members` sin recursión):

```sql
-- Familias y bebés del usuario de la petición. SECURITY DEFINER en un esquema no expuesto, con la
-- identidad comprobada DENTRO de la función y EXECUTE revocado a todos salvo app_tenant y authenticated.
CREATE FUNCTION private.my_household_ids(min_write boolean DEFAULT false)
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT m.household_id
  FROM public.household_members m
  WHERE m.user_id = (SELECT private.auth_uid())
    AND (NOT min_write OR m.role IN ('OWNER', 'MEMBER', 'CAREGIVER'));
$$;

CREATE FUNCTION private.my_baby_ids(min_write boolean DEFAULT false)
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT b.id FROM public.babies b
  WHERE b.household_id IN (SELECT private.my_household_ids(min_write));
$$;

CREATE FUNCTION private.my_role(target_household uuid)
RETURNS public."HouseholdRole"
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT m.role FROM public.household_members m
  WHERE m.household_id = target_household AND m.user_id = (SELECT private.auth_uid());
$$;

REVOKE ALL ON FUNCTION private.my_household_ids(boolean), private.my_baby_ids(boolean),
  private.my_role(uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.my_household_ids(boolean), private.my_baby_ids(boolean),
  private.my_role(uuid) TO app_tenant;

-- Patrón por tabla de registros (se repite para diaper_changes, sleep_sessions,
-- growth_measurements y health_records). `IN (SELECT f())` se evalúa una vez por consulta
-- (subplan con hash), no por fila; baby_id ya está indexado por (baby_id, <fecha>).
GRANT SELECT, INSERT, UPDATE, DELETE ON "feedings" TO app_tenant;

CREATE POLICY "tenant_select" ON "feedings" FOR SELECT TO app_tenant
  USING ("baby_id" IN (SELECT private.my_baby_ids()));

CREATE POLICY "tenant_insert" ON "feedings" FOR INSERT TO app_tenant
  WITH CHECK ("baby_id" IN (SELECT private.my_baby_ids(true))
              AND "created_by_id" = (SELECT private.auth_uid()));

CREATE POLICY "tenant_update" ON "feedings" FOR UPDATE TO app_tenant
  USING ("baby_id" IN (SELECT private.my_baby_ids(true)))
  WITH CHECK ("baby_id" IN (SELECT private.my_baby_ids(true))
              AND "updated_by_id" = (SELECT private.auth_uid()));

CREATE POLICY "tenant_delete" ON "feedings" FOR DELETE TO app_tenant
  USING ("baby_id" IN (SELECT private.my_baby_ids(true)));

-- CAREGIVER solo edita o borra lo suyo: política RESTRICTIVA adicional (se combina con AND).
CREATE POLICY "caregiver_own_rows" ON "feedings" AS RESTRICTIVE FOR UPDATE TO app_tenant
  USING (private.my_role((SELECT b.household_id FROM public.babies b WHERE b.id = "baby_id")) <> 'CAREGIVER'
         OR "created_by_id" = (SELECT private.auth_uid()));
-- (y la misma para DELETE)

-- Familias, miembros, invitaciones y bebés
GRANT SELECT, UPDATE, DELETE ON "households" TO app_tenant;
CREATE POLICY "tenant_select" ON "households" FOR SELECT TO app_tenant
  USING ("id" IN (SELECT private.my_household_ids()));
CREATE POLICY "owner_update" ON "households" FOR UPDATE TO app_tenant
  USING (private.my_role("id") = 'OWNER') WITH CHECK (private.my_role("id") = 'OWNER');
CREATE POLICY "owner_delete" ON "households" FOR DELETE TO app_tenant
  USING (private.my_role("id") = 'OWNER');

GRANT SELECT, UPDATE, DELETE ON "household_members" TO app_tenant;
CREATE POLICY "tenant_select" ON "household_members" FOR SELECT TO app_tenant
  USING ("household_id" IN (SELECT private.my_household_ids()));  -- ver a los demás miembros (nombres)
CREATE POLICY "self_or_owner_delete" ON "household_members" FOR DELETE TO app_tenant
  USING ("user_id" = (SELECT private.auth_uid()) OR private.my_role("household_id") = 'OWNER');
CREATE POLICY "self_update_display_name" ON "household_members" FOR UPDATE TO app_tenant
  USING ("user_id" = (SELECT private.auth_uid())) WITH CHECK ("user_id" = (SELECT private.auth_uid()));
-- Altas de miembros: solo por canje de invitación con systemDb (lista cerrada, §6.4).

GRANT SELECT, INSERT, UPDATE ON "household_invites" TO app_tenant;
CREATE POLICY "manager_all" ON "household_invites" FOR ALL TO app_tenant
  USING (private.my_role("household_id") IN ('OWNER', 'MEMBER'))
  WITH CHECK (private.my_role("household_id") IN ('OWNER', 'MEMBER'));

GRANT SELECT, INSERT, UPDATE ON "babies" TO app_tenant;
CREATE POLICY "tenant_select" ON "babies" FOR SELECT TO app_tenant
  USING ("household_id" IN (SELECT private.my_household_ids()));
CREATE POLICY "manager_write" ON "babies" FOR ALL TO app_tenant
  USING (private.my_role("household_id") IN ('OWNER', 'MEMBER'))
  WITH CHECK (private.my_role("household_id") IN ('OWNER', 'MEMBER'));

GRANT SELECT, INSERT, UPDATE ON "profiles" TO app_tenant;
CREATE POLICY "self" ON "profiles" FOR ALL TO app_tenant
  USING ("user_id" = (SELECT private.auth_uid())) WITH CHECK ("user_id" = (SELECT private.auth_uid()));

GRANT SELECT ON "household_feature_overrides" TO app_tenant;
CREATE POLICY "tenant_select" ON "household_feature_overrides" FOR SELECT TO app_tenant
  USING ("household_id" IN (SELECT private.my_household_ids()));

-- Las políticas SELECT existentes para `authenticated` (Realtime, decisión 029) NO cambian.
```

**Verificación (regla 0.2 + `verify-db`):**
- `pg_roles.rolbypassrls = false` para `app_tenant`;
- cada tabla de `public` con `rowsecurity = true` y sus 4 políticas `tenant_*`;
- `get_advisors` sin avisos nuevos (los avisos sobre `SECURITY DEFINER` en `private` quedan documentados como esperados);
- suite de aislamiento (§6.6) en verde.

### 11.3 K3 · `household_chat`

**Bootstrap** (`postgres`, porque `realtime.send` lo exige; §4b nuevo):

```sql
create or replace function private.broadcast_household_row_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare target uuid := case when tg_op = 'DELETE' then old.household_id else new.household_id end;
begin
  perform realtime.send(jsonb_build_object('table', tg_table_name, 'op', tg_op),
                        'change', 'household:' || target::text, true);
  return null;
end; $$;
revoke all on function private.broadcast_household_row_change() from public, anon, authenticated, service_role;
grant execute on function private.broadcast_household_row_change() to prisma;
```

**Migración:**

```sql
-- Generado por Prisma ─────────────────────────────────────────────────────────
CREATE TABLE "household_messages" (
  "id"           UUID PRIMARY KEY,                                 -- generado en el cliente (idempotente)
  "household_id" UUID NOT NULL REFERENCES "households"("id") ON DELETE CASCADE,
  "author_id"    UUID NOT NULL,
  "body"         TEXT NOT NULL,
  "edited_at"    TIMESTAMPTZ(3),
  "deleted_at"   TIMESTAMPTZ(3),
  "created_at"   TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
  "updated_at"   TIMESTAMPTZ(3) NOT NULL
);
CREATE INDEX "household_messages_household_id_created_at_id_idx"
  ON "household_messages" ("household_id", "created_at" DESC, "id" DESC);   -- paginación por cursor

CREATE TABLE "household_message_reads" (
  "household_id" UUID NOT NULL REFERENCES "households"("id") ON DELETE CASCADE,
  "user_id"      UUID NOT NULL,
  "last_read_at" TIMESTAMPTZ(3) NOT NULL,
  PRIMARY KEY ("household_id", "user_id")
);

-- Añadido a mano ──────────────────────────────────────────────────────────────
ALTER TABLE "household_messages" ADD CONSTRAINT "household_messages_body_length"
  CHECK (char_length("body") BETWEEN 1 AND 2000);
ALTER TABLE "household_messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "household_message_reads" ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON "household_messages" TO app_tenant;   -- borrado lógico = UPDATE
CREATE POLICY "tenant_select" ON "household_messages" FOR SELECT TO app_tenant
  USING ("household_id" IN (SELECT private.my_household_ids()));
CREATE POLICY "member_insert" ON "household_messages" FOR INSERT TO app_tenant
  WITH CHECK ("household_id" IN (SELECT private.my_household_ids())
              AND "author_id" = (SELECT private.auth_uid()));
CREATE POLICY "author_update" ON "household_messages" FOR UPDATE TO app_tenant
  USING ("author_id" = (SELECT private.auth_uid()))
  WITH CHECK ("author_id" = (SELECT private.auth_uid()));

GRANT SELECT, INSERT, UPDATE ON "household_message_reads" TO app_tenant;
CREATE POLICY "self" ON "household_message_reads" FOR ALL TO app_tenant
  USING ("user_id" = (SELECT private.auth_uid()))
  WITH CHECK ("user_id" = (SELECT private.auth_uid())
              AND "household_id" IN (SELECT private.my_household_ids()));

CREATE TRIGGER "broadcast_household_change"
  AFTER INSERT OR UPDATE OR DELETE ON "household_messages"
  FOR EACH ROW EXECUTE FUNCTION private.broadcast_household_row_change();
-- Sin GRANT a authenticated ni publicación en supabase_realtime (decisión 066).
```

### 11.4 K4 · `growth_reference_lms`

```sql
-- Generado por Prisma ─────────────────────────────────────────────────────────
CREATE TYPE "GrowthIndicator" AS ENUM ('WEIGHT_FOR_AGE', 'LENGTH_FOR_AGE', 'HEAD_CIRCUMFERENCE_FOR_AGE');
CREATE TABLE "growth_reference_lms" (
  "standard"  TEXT NOT NULL,                 -- 'WHO_2006'
  "indicator" "GrowthIndicator" NOT NULL,
  "sex"       "BabySex" NOT NULL,
  "age_days"  SMALLINT NOT NULL,
  "l"         DOUBLE PRECISION NOT NULL,      -- excepción a los enteros (007): parámetros estadísticos
  "m"         DOUBLE PRECISION NOT NULL,
  "s"         DOUBLE PRECISION NOT NULL,
  PRIMARY KEY ("standard", "indicator", "sex", "age_days")
);

-- Añadido a mano ──────────────────────────────────────────────────────────────
ALTER TABLE "growth_reference_lms" ADD CONSTRAINT "growth_reference_lms_age_range"
  CHECK ("age_days" BETWEEN 0 AND 1856);
ALTER TABLE "growth_reference_lms" ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON "growth_reference_lms" TO app_tenant;
CREATE POLICY "reference_read" ON "growth_reference_lms" FOR SELECT TO app_tenant USING (true);
-- Datos: scripts/load-growth-reference.ts (upsert idempotente con checksum), tras cada migrate deploy.
```

### 11.5 K5 · `report_exports`

**Bootstrap** (`postgres`; bucket privado, sin políticas para `authenticated`, de modo que solo el servidor lo usa):

```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('reports', 'reports', false, 10485760, array['application/pdf'])
on conflict (id) do nothing;
```

**Migración:**

```sql
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'READY', 'FAILED');
CREATE TABLE "report_exports" (
  "id"              UUID PRIMARY KEY,
  "baby_id"         UUID NOT NULL REFERENCES "babies"("id") ON DELETE CASCADE,
  "requested_by_id" UUID NOT NULL,
  "range_start"     DATE NOT NULL,
  "range_end"       DATE NOT NULL,
  "locale"          TEXT NOT NULL,
  "status"          "ReportStatus" NOT NULL DEFAULT 'PENDING',
  "storage_path"    TEXT,
  "expires_at"      TIMESTAMPTZ(3) NOT NULL,
  "created_at"      TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
  "updated_at"      TIMESTAMPTZ(3) NOT NULL
);
CREATE INDEX "report_exports_baby_id_created_at_idx" ON "report_exports" ("baby_id", "created_at");

CREATE TABLE "report_share_links" (
  "id"            UUID PRIMARY KEY,
  "report_id"     UUID NOT NULL REFERENCES "report_exports"("id") ON DELETE CASCADE,
  "token_hash"    TEXT NOT NULL UNIQUE,         -- SHA-256 del token; el token se muestra una vez (ADR-043)
  "expires_at"    TIMESTAMPTZ(3) NOT NULL,
  "revoked_at"    TIMESTAMPTZ(3),
  "created_by_id" UUID NOT NULL,
  "created_at"    TIMESTAMPTZ(3) NOT NULL DEFAULT now()
);
CREATE INDEX "report_share_links_report_id_idx" ON "report_share_links" ("report_id");

-- Añadido a mano
ALTER TABLE "report_exports" ADD CONSTRAINT "report_exports_range_valid"
  CHECK ("range_end" >= "range_start" AND "range_end" - "range_start" <= 366);
ALTER TABLE "report_exports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "report_share_links" ENABLE ROW LEVEL SECURITY;
-- Políticas tenant_* con el patrón de §11.2 sobre baby_id (report_exports) y sobre el informe
-- (report_share_links). /r/<token> resuelve el token con systemDb (lista cerrada) y nunca expone el id.
```

### 11.6 K6 · `ai_assistant`

**Bootstrap:** `create extension if not exists vector with schema extensions;`

```sql
CREATE TYPE "AiInteractionKind" AS ENUM ('ASK', 'PARSE_TEXT', 'PARSE_VOICE');
CREATE TYPE "AiInteractionOutcome" AS ENUM ('ANSWERED', 'CONFIRMED', 'DISCARDED', 'REFUSED', 'ERROR');

CREATE TABLE "ai_consents" (
  "household_id"   UUID PRIMARY KEY REFERENCES "households"("id") ON DELETE CASCADE,
  "granted_by_id"  UUID NOT NULL,
  "policy_version" TEXT NOT NULL,
  "granted_at"     TIMESTAMPTZ(3) NOT NULL,
  "revoked_at"     TIMESTAMPTZ(3),
  "created_at"     TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
  "updated_at"     TIMESTAMPTZ(3) NOT NULL
);

CREATE TABLE "ai_usage" (
  "household_id"  UUID NOT NULL REFERENCES "households"("id") ON DELETE CASCADE,
  "day"           DATE NOT NULL,                -- en la zona de la familia
  "requests"      INTEGER NOT NULL DEFAULT 0,
  "input_tokens"  INTEGER NOT NULL DEFAULT 0,
  "output_tokens" INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY ("household_id", "day")
);

CREATE TABLE "ai_interactions" (                -- metadatos, NUNCA contenido (minimización)
  "id"            UUID PRIMARY KEY,
  "household_id"  UUID NOT NULL REFERENCES "households"("id") ON DELETE CASCADE,
  "user_id"       UUID NOT NULL,
  "kind"          "AiInteractionKind" NOT NULL,
  "outcome"       "AiInteractionOutcome" NOT NULL,
  "model"         TEXT NOT NULL,
  "input_tokens"  INTEGER NOT NULL,
  "output_tokens" INTEGER NOT NULL,
  "latency_ms"    INTEGER NOT NULL,
  "created_at"    TIMESTAMPTZ(3) NOT NULL DEFAULT now()
);
CREATE INDEX "ai_interactions_household_id_created_at_idx" ON "ai_interactions" ("household_id", "created_at");

CREATE TABLE "knowledge_documents" (            -- corpus curado, global (no es de ninguna familia)
  "id"         UUID PRIMARY KEY,
  "source_url" TEXT NOT NULL,
  "title"      TEXT NOT NULL,
  "license"    TEXT NOT NULL,
  "locale"     TEXT NOT NULL,
  "version"    TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(3) NOT NULL
);
CREATE TABLE "knowledge_chunks" (
  "id"          UUID PRIMARY KEY,
  "document_id" UUID NOT NULL REFERENCES "knowledge_documents"("id") ON DELETE CASCADE,
  "chunk_index" INTEGER NOT NULL,
  "content"     TEXT NOT NULL,
  "embedding"   extensions.vector(768) NOT NULL,   -- Prisma: Unsupported("vector(768)"); consultas con TypedSQL
  "created_at"  TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
  UNIQUE ("document_id", "chunk_index")
);

-- Añadido a mano
CREATE INDEX "knowledge_chunks_embedding_hnsw" ON "knowledge_chunks"
  USING hnsw ("embedding" extensions.vector_cosine_ops);
ALTER TABLE "ai_consents" ENABLE ROW LEVEL SECURITY;      -- + políticas: SELECT miembros, escribir OWNER
ALTER TABLE "ai_usage" ENABLE ROW LEVEL SECURITY;         -- + SELECT miembros; escritura con systemDb (contador atómico)
ALTER TABLE "ai_interactions" ENABLE ROW LEVEL SECURITY;  -- + INSERT del propio usuario; SELECT OWNER
ALTER TABLE "knowledge_documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "knowledge_chunks" ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON "knowledge_documents", "knowledge_chunks" TO app_tenant;
CREATE POLICY "reference_read" ON "knowledge_documents" FOR SELECT TO app_tenant USING (true);
CREATE POLICY "reference_read" ON "knowledge_chunks" FOR SELECT TO app_tenant USING (true);
```

### 11.7 K8 · `sleep_predictions` (solo la V2)

```sql
CREATE TABLE "sleep_predictions" (
  "baby_id"        UUID PRIMARY KEY REFERENCES "babies"("id") ON DELETE CASCADE,
  "method"         TEXT NOT NULL,            -- 'QUANTILE_V2'…
  "window_start"   TIMESTAMPTZ(3) NOT NULL,
  "window_end"     TIMESTAMPTZ(3) NOT NULL,
  "inputs_summary" JSONB NOT NULL,           -- recuentos y medianas, sin registros individuales
  "computed_at"    TIMESTAMPTZ(3) NOT NULL,
  "created_at"     TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
  "updated_at"     TIMESTAMPTZ(3) NOT NULL
);
ALTER TABLE "sleep_predictions" ADD CONSTRAINT "sleep_predictions_window_valid"
  CHECK ("window_end" > "window_start");
ALTER TABLE "sleep_predictions" ENABLE ROW LEVEL SECURITY;   -- + tenant_select; escritura solo del trabajo por lotes
```

### 11.8 K9 · `billing`

```sql
CREATE TYPE "PlanTier" AS ENUM ('FREE', 'PLUS', 'FAMILY');
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELED');
CREATE TABLE "subscriptions" (
  "household_id"             UUID PRIMARY KEY REFERENCES "households"("id") ON DELETE CASCADE,
  "tier"                     "PlanTier" NOT NULL DEFAULT 'FREE',
  "status"                   "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
  "provider_customer_id"     TEXT UNIQUE,
  "provider_subscription_id" TEXT UNIQUE,
  "current_period_end"       TIMESTAMPTZ(3),
  "created_at"               TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
  "updated_at"               TIMESTAMPTZ(3) NOT NULL
);
CREATE TABLE "billing_events" (               -- idempotencia del webhook: el id del evento del proveedor
  "id"           TEXT PRIMARY KEY,
  "type"         TEXT NOT NULL,
  "received_at"  TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
  "processed_at" TIMESTAMPTZ(3)
);
ALTER TABLE "subscriptions" ENABLE ROW LEVEL SECURITY;     -- + SELECT miembros; escritura solo del webhook (systemDb)
ALTER TABLE "billing_events" ENABLE ROW LEVEL SECURITY;    -- sin políticas: solo systemDb
-- Los derechos se derivan en código: entitlementsFor(tier) (pura y testeada), sin tabla.
```

---

## 12. Orden secuencial estricto de desarrollo

> Cada fase empieza solo cuando la anterior cumple su **criterio de salida** y la aprobaste. Cada fase tiene su propio plan detallado en `docs/superpowers/plans/` antes de escribir código (protocolo §0.3). **Tamaño:** S (≤ 1 semana), M (1–3 semanas), L (3–6 semanas), con una persona y Claude.

### K0 · Fundaciones: entornos, CI/CD y limpieza (M)

1. Aprobar este plan y las decisiones 073–084 (o ajustarlas).
2. Etiqueta `v1.0.0-mvp` sobre `cff4e4d`; revisar y archivar las 3 ramas y *worktrees* obsoletos (R8).
3. Proteger `main` en GitHub (PR obligatoria y CI obligatoria).
4. Crear `kidoo-staging` (paso manual, §3.5): *bootstrap*, `migrate deploy`, seed sintético y `kidoo_test`.
5. `ci.yml` (§4.1) con Postgres efímero; adaptar `scripts/test-db.ts` y la guarda a staging o CI.
6. `scripts/verify-db.ts` y `db-deploy.yml` (§4.2) con los entornos protegidos de GitHub.
7. Variables de *Preview* de Vercel → staging.
8. Borrar `baby_tracker_test` de la instancia de producción (**con tu confirmación explícita**, regla 0.2).
9. Decidir la observabilidad de errores (§15 · D4) y, si se aprueba, integrarla.

**Salida:**
- una PR de prueba pasa la CI completa y genera *Preview* contra staging;
- una migración vacía recorre staging → aprobación → producción con `verify-db` en verde;
- ningún test toca la instancia de producción.

### K1 · Multi-tenant (L)

1. Migración 11.1 (*expand*) y `schema.prisma`.
2. `withTenant`, `systemDb` y la regla de ESLint de la lista cerrada; migración 11.2 y cambios en el *bootstrap* y los *stubs*.
3. Migrar queries y actions módulo a módulo a `withTenant`, con PR por módulo.
4. Suite de aislamiento (§6.6) con pruebas de mutación de las políticas.
5. Roles en invitaciones y en la UI de Ajustes; familia activa (cookie) y selector; `requireMember()` con rol.
6. `households.time_zone`: sustituir `env.APP_TIMEZONE` por la zona de la familia. `APP_TIMEZONE` queda solo como valor por defecto de familias nuevas.
7. `babies.updated_by_id` y su autoría; señal Realtime al eliminar la familia (R11).
8. *Contract*: limpiar el código de «una familia por usuario».

**Salida:**
- suite de aislamiento en verde **con las comprobaciones del código desactivadas**;
- p95 de «Hoy» con un aumento de menos de 10 ms;
- un usuario en dos familias, y un VIEWER que no puede escribir ni por la UI ni por la BD.

### K2 · Internacionalización y marca (M)

1. Instalar `next-intl` (verificando versiones) y configurarlo sin prefijo de idioma.
2. `profiles.locale`, cookie y detección; selector de idioma en Ajustes.
3. Extraer los textos por módulo a `messages/es/*.json`; traducir a `en`; test de claves completas y regla ESLint anti-literales.
4. `dates.ts` con *locale*; unidades imperiales en presentación y entrada.
5. Nombre de la app como mensaje; manifiesto por idioma; iconos definitivos (R12) si la marca está decidida.

**Salida:** la app completa en `en` sin un solo texto en español; tests y build en verde; revisión de accesibilidad en ambos idiomas.

### K3 · Chat familiar (M)

1. *Bootstrap* §4b y migración 11.3.
2. `features/chat`: esquemas, queries con cursor, actions idempotentes y `labels`.
3. UI `/chat`: lista virtualizada, envío optimista, no leídos y estados sin conexión, vacío y error.
4. *(K3b, opcional)* Web Push con aviso sin contenido.

**Salida:** dos dispositivos conversan con menos de 2 s de latencia; sin duplicados con doble toque; mensaje ajeno invisible por RLS; verificación vía MCP del *trigger* y de las particiones.

### K4 · Curvas de percentiles OMS (M)

1. **Confirmar la licencia** de los datos de la OMS para uso comercial.
2. Migración 11.4 y `scripts/load-growth-reference.ts`.
3. `percentiles.ts` (LMS y edad corregida) con tests frente a valores publicados.
4. Gráfica SVG accesible y edad gestacional en el formulario del bebé.

**Salida:** percentiles idénticos a la calculadora oficial de la OMS en 30 casos de prueba; gráfica legible a 375 px en claro y oscuro.

### K5 · Informe para el pediatra (M)

1. *Bootstrap* (bucket) y migración 11.5.
2. Instalar `@react-pdf/renderer` (verificando la compatibilidad con React 19); plantilla traducida.
3. Route Handler de exportación; enlace compartible `/r/<token>` con límite de intentos; exclusión en el proxy.
4. Limpieza programada de informes caducados.

**Salida:** informe de 3 meses en menos de 5 s; enlace revocado o caducado que responde igual que uno inexistente; ningún PDF accesible sin token válido.

### K6 · Asistente IA por texto (L)

1. **Requisitos previos (bloqueantes):**
   - EIPD (evaluación de impacto) aprobada;
   - DPA de Google Cloud;
   - región UE y modelo verificados;
   - textos de consentimiento revisados.
2. Instalar `ai` y `@ai-sdk/google-vertex` (versiones verificadas); credenciales de servicio solo en el servidor.
3. *Bootstrap* (`vector`) y migración 11.6; carga del corpus curado.
4. `features/assistant`: consentimiento, cuotas, herramientas de solo lectura con `withTenant`, salida estructurada validada con los esquemas existentes y tarjetas de confirmación.
5. Conjunto de oro y pruebas adversariales (§9.6).
6. *Flag* `FEATURE_AI` solo para familias beta.

**Salida:** exactitud ≥ 95 % en el conjunto de oro; 0 escrituras sin confirmación; 0 fugas entre familias en las pruebas adversariales; coste medio por familia y día medido.

### K7 · Registro por voz (S)

1. `MediaRecorder` con límite de 30 s; Server Action con límite de tamaño; misma salida estructurada.
2. Pruebas en iOS (PWA instalada) y Android.

**Salida:** frase de 10 s registrada en menos de 4 s de extremo a extremo; el audio no persiste en ningún sitio (verificado).

### K8 · Predicción de ventanas de sueño (M)

1. V1 heurística (`prediction.ts`) con tabla de ventanas por edad revisada y citada; tarjeta en «Hoy» y en «Sueño».
2. Recogida de métricas de acierto en beta.
3. *(V2)* Migración 11.7 y trabajo por lotes nocturno, solo si la V1 demuestra valor.

**Salida:** error absoluto medio de la V1 medido en beta; textos sin lenguaje médico; revisión regulatoria hecha antes de la V2.

### K9 · Monetización y lanzamiento (L)

1. Decisión del proveedor de pagos; migración 11.8; *webhook* (Route Handler idempotente); `entitlementsFor(tier)`; pantallas de plan.
2. Pasar a planes comerciales: Vercel Pro, Supabase Pro con copias PITR y región UE.
3. Legal: política de privacidad, términos, subencargados, aviso de IA, exportación y eliminación de cuenta (§13).
4. **Marca registrada o nombre definitivo**; renombrar repo, proyecto de Vercel, proyectos de Supabase y paquete.
5. Lighthouse ≥ 90, iconos definitivos y web pública con idiomas (aquí sí con prefijos).

**Salida:** primera suscripción real cobrada y reflejada en los derechos; auditoría de seguridad (`/security-review`) sin hallazgos críticos.

### Dependencias nuevas previstas (regla 0.7)

| Fase | Paquete | Problema que resuelve | Por qué no basta lo que hay |
|---|---|---|---|
| K2 | `next-intl` | Mensajes ICU, carga por idioma en Server Components, formato | Next.js no trae i18n para App Router; hacerlo a mano es reimplementar ICU |
| K3b | `web-push` (o Edge Function) | Firma VAPID y cifrado de Web Push | La API del navegador solo suscribe; el envío exige criptografía en el servidor |
| K5 | `@react-pdf/renderer` | PDF en el servidor sin navegador | Chromium *headless* no cabe bien en funciones *serverless* |
| K6 | `ai`, `@ai-sdk/google-vertex` | Llamadas al modelo, herramientas, salida estructurada y *streaming* | Las APIs REST de Vertex a mano duplican lo que el SDK estandariza |
| K9 | `stripe` (por decidir) | Pagos, suscripciones y *webhooks* firmados | Cobrar no se reimplementa |

Las versiones se fijan y se verifican contra la documentación oficial al instalarlas (regla 0.4), nunca de memoria.

---

## 13. Cumplimiento normativo y riesgos

> No es asesoramiento jurídico. Antes de K6 y de K9 hace falta revisión de un profesional de protección de datos y, para las funciones predictivas, de un experto en regulación sanitaria.

### 13.1 RGPD

- **Datos de categoría especial** (salud, art. 9) **de menores**: base jurídica de consentimiento explícito de los progenitores, con finalidades separadas (registro, compartir con la familia, IA, informes).
- **EIPD obligatoria** antes de la IA y probablemente antes del lanzamiento: tratamiento a gran escala de datos de salud y tecnología nueva.
- **Subencargados** (Supabase, Vercel, Google Cloud y el proveedor de pagos): DPA firmados, región UE donde exista y lista pública de subencargados.
- **Derechos:**
  - exportación de los datos de la familia en JSON y CSV (portabilidad);
  - eliminación de cuenta, que hoy no existe y exige borrar el usuario de Supabase Auth: necesitará la clave secreta **solo en el servidor** (cambio de la regla 2.7, a decidir en K1 o K9);
  - eliminación de familia (ya existe, decisión 071).
- **Minimización:** sin transcripciones de IA, sin audio, avisos push sin contenido y nada de datos de producción en staging.

### 13.2 Regulación sanitaria y de IA

- **Reglamento de productos sanitarios (MDR, regla 11):** el software que da información para decisiones diagnósticas o terapéuticas puede ser producto sanitario. Kidoo se mantiene en **registro, resumen y referencia estadística**: sin alertas clínicas, sin «riesgo» y con derivación al pediatra. Las predicciones (K8) y el asistente (K6) se revisan con este criterio antes de publicarlos.
- **Reglamento de IA de la UE:** transparencia (avisar de que se interactúa con una IA y marcar el contenido generado). Sin usos de alto riesgo previstos.

### 13.3 Riesgos

| Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|
| Conflicto de marca «Kidoo» | Alta | Alto | Búsqueda de marca antes de K2; «Kidoo» como nombre en clave (073) |
| Fuga entre familias | Baja | Crítico | RLS aplicada al servidor (078) y suite de aislamiento con mutación (§6.6) |
| Coste de IA descontrolado | Media | Medio | Cuotas en BD, modelo Flash y beta cerrada (§9.5) |
| Alucinación que se registra | Media | Alto | Confirmación humana y validación Zod (081) |
| `withTenant` degrada la latencia | Baja | Medio | Medir en K1; agrupar `set_config` y `SET ROLE`; índices |
| Licencia OMS no comercial | Media | Medio | Verificar antes de K4; alternativa: referencias con licencia abierta o permiso |
| Migración aplicada a producción con código incompatible | Media | Alto | *Expand → migrate → contract* y aprobación manual (076) |
| Particiones de Realtime ausentes | Baja | Medio | `verify-db` en cada despliegue (066) |

---

## 14. Costes orientativos (a validar con los precios vigentes)

| Concepto | Hoy | Kidoo (lanzamiento) |
|---|---|---|
| Vercel | Hobby (no comercial) | **Pro**, obligatorio para uso comercial |
| Supabase producción | Plan actual | **Pro** + cómputo según carga + PITR recomendado |
| Supabase staging | — | Free (se pausa por inactividad) o cómputo mínimo |
| Vertex AI | — | Por tokens; acotado por cuotas por familia y plan |
| GitHub Actions | — | Minutos gratuitos del plan; suficientes para un repo |
| Dominio y marca | — | Registro de marca (EUIPO/OEPM) y dominio |

---

## 15. Decisiones que necesito de ti antes de K0

| # | Decisión | Mi recomendación |
|---|---|---|
| D1 | **Nombre:** ¿«Kidoo» como nombre en clave hasta verificar la marca, o buscamos otro ya? | Nombre en clave; búsqueda de marca antes de K2 |
| D2 | **Staging:** ¿lo creas tú en el panel o me autorizas a crearlo vía MCP (con confirmación de coste)? | Créalo tú o autorízame tras ver el coste |
| D3 | **Despliegue de producción:** ¿Vercel despliega `main` automáticamente (y aplicamos *expand/contract*) o promovemos desde GitHub tras migrar? | Automático + *expand/contract* (menos piezas) |
| D4 | **Observabilidad:** ¿añadimos un servicio de errores con región UE (por ejemplo Sentry EU) o nos quedamos con Vercel Observability? Cambia la regla «ningún tercero» de §5. | Vercel Observability en K0; servicio externo con región UE antes de K9 |
| D5 | **Roles:** ¿te sirven `OWNER · MEMBER · CAREGIVER · VIEWER` y el selector de familia activa? | Sí |

---

## Fuentes

- Supabase, [Branching](https://supabase.com/docs/guides/deployment/branching), [Manage Branching usage](https://supabase.com/docs/guides/platform/manage-your-usage/branching) y [RAG with Permissions](https://supabase.com/docs/guides/ai/rag-with-permissions) (documentación consultada vía MCP el 2026-10-24).
- Residencia y uso de datos de Gemini y Vertex AI (fuentes secundarias, **a contrastar con los términos de Google**): [SpotDev](https://www.spotdev.co.uk/blog/ai-data-residency-uk-chatgpt-claude-gemini-grok-muse), [Eden AI](https://www.edenai.co/post/how-to-use-openai-claude-gemini-in-europe-without-gdpr-risk), [Omnifact](https://omnifact.ai/blog/feature-drop-eu-data-residency-vertex-ai), [foro de Google AI](https://discuss.ai.google.dev/t/eu-data-privacy-rights-and-the-gemini-api/37913), [Google Cloud – Gemini Enterprise locations](https://docs.cloud.google.com/gemini/enterprise/docs/locations?authuser=1).
- Mercado: [Huckleberry en App Store](https://apps.apple.com/MX/app/id1169136078), [anuncio de Huckleberry Plus](https://huckleberrycare.com/huckleberry-plus-announcement), [paywall de Huckleberry (Adapty)](https://adapty.io/paywall-library/huckleberry/), [Baby Tracker: Newborn Growth](https://apps.apple.com/us/app/-/id1561787685), [BabyTrack](https://apps.apple.com/us/app/id6451158784), [Baby Tracker Newborn – Biguma](https://apps.apple.com/app/id6743999281), [Baby Tracker | Aiko](https://mwm.ai/apps/baby-tracker-aiko/6759402815), [Baby Tracker – Newborn Tracker](https://apps.apple.com/app/id1368995392).
- Marca: [KIDDOAPP (Justia Trademarks)](https://trademarks.justia.com/864/24/kiddoapp-86424686.html), [Kidooo AI](https://apps.appfollow.io/ios/kidooo-ai/6504976122?country=cz), [KidDoo!](https://apps.apple.com/us/app/id6505066728), [KidoO](https://outilstice.com/kidoo-un-carnet-de-suivi-enseignants-maternelle/).
