# CLAUDE.md — Directrices de desarrollo de Baby Tracker

> **Instrucción permanente para Claude:** lee este archivo **completo** al inicio de cada sesión y **antes de proponer cualquier solución**, diseño o cambio de código. Estas reglas tienen prioridad sobre tus hábitos por defecto. Si una petición contradice alguna regla, dilo explícitamente y propón una alternativa antes de actuar; no rompas una regla en silencio.

---

## 0. Protocolo de trabajo (obligatorio en cada interacción)

1. **Leer contexto:** este archivo completo + el Roadmap de `README.md` para saber en qué fase estamos y qué tareas están hechas (`[x]`).
2. **Ubicar la petición** en el roadmap (fase y tarea). Si no encaja, avisar: ¿es alcance nuevo?, ¿va al backlog?
3. **Planificar antes de codificar** cuando el cambio no sea trivial: qué archivos se crean o modifican y qué decisiones implica. Pedir confirmación antes de cambios grandes o difíciles de revertir: esquema de BD, dependencias nuevas, estructura de carpetas, cambios en estas reglas.
4. **Verificar APIs contra las versiones instaladas** (`package.json`), no contra la memoria. Next.js 16, React 19, Prisma 7, Zod 4, Tailwind CSS 4 y `@supabase/ssr` cambiaron APIs importantes respecto a versiones anteriores. Ante la duda, consultar la documentación oficial.
5. **Cerrar el trabajo:** ejecutar `npm run typecheck`, `npm run lint` y los tests relevantes; marcar las casillas del roadmap en `README.md`; añadir al [Registro de decisiones](#7-registro-de-decisiones) cualquier decisión nueva.
6. **Idioma:** conversar con el usuario en español. Código, identificadores, BD, rutas, commits y comentarios técnicos en inglés. Textos visibles de la UI en español.
7. **Dependencias:** no añadir ninguna sin justificar qué problema resuelve y por qué no basta con lo que ya hay.
8. **Skills primero:** en cada paso, evaluar y ejecutar las skills disponibles antes de escribir una solución propia (ver [0.1](#01-regla-de-alta-prioridad-uso-proactivo-de-skills)).
9. **MCP para la base de datos:** inspeccionar, verificar migraciones y depurar datos con el MCP de Supabase/PostgreSQL, sin pedir al usuario que ejecute SQL (ver [0.2](#02-regla-de-alta-prioridad-uso-de-mcp-para-la-base-de-datos)).

### 0.1 Regla de alta prioridad: uso proactivo de skills

> **REGLA ESTRICTA.** El entorno cuenta con un amplio catálogo de custom skills configuradas (especialmente para diseño UI/UX, generación de componentes, linters, etc.). Tienes la obligación **ESTRICTA** de evaluar y ejecutar estas skills de forma proactiva en cada paso para garantizar una implementación perfecta de grado Senior, antes de intentar escribir soluciones genéricas desde cero.

**Cómo se aplica:**

- Antes de cada paso (planificar, diseñar una pantalla, crear un componente, escribir tests, revisar o depurar), revisar la lista de skills disponibles en la sesión y ejecutar las que encajen **antes** de escribir código propio.
- Orientación por tipo de tarea (los nombres pueden variar según el entorno; manda la lista real de la sesión):

| Tarea | Skills a evaluar |
|---|---|
| Decisiones de arquitectura, nuevas dependencias, modelo de datos | `engineering:architecture`, `engineering:system-design` |
| Supabase: RLS, Auth, Realtime, conexiones | skills de Supabase si están instaladas (p. ej. `supabase/agent-skills`) + `search_docs` del MCP de Supabase |
| Diseño de pantallas y componentes UI | `frontend-design`, `design:design-system` |
| Textos de interfaz (botones, errores, estados vacíos) | `design:ux-copy` |
| Accesibilidad | `design:accessibility-review` |
| Estrategia y escritura de tests | `engineering:testing-strategy` |
| Revisión antes de cerrar una tarea | `engineering:code-review` |
| Depuración de errores | `engineering:debug` |
| Linters, formateo u otras herramientas configuradas como skill | la skill correspondiente, antes de configurarlas a mano |

- Las skills complementan este archivo, no lo sustituyen: si el resultado de una skill choca con una regla de `CLAUDE.md` (p. ej. propone un formulario dentro de un modal), manda `CLAUDE.md` y se adapta el resultado.
- Al cerrar cada tarea, indicar qué skills se han usado; si ninguna aplicaba, decirlo explícitamente.

### 0.2 Regla de alta prioridad: uso de MCP para la base de datos

> **REGLA ESTRICTA.** Cuando haya un servidor MCP de PostgreSQL/Supabase activo en la sesión, es **obligatorio** usarlo para inspeccionar el estado de la base de datos, validar que las migraciones de Prisma se han aplicado correctamente y depurar datos de prueba. **No se pide al usuario que ejecute comandos SQL manualmente.**

**Cuándo es obligatorio:**

- **Tras cada `prisma migrate dev` o `prisma migrate deploy`**, verificar:
  - la tabla `public._prisma_migrations`: la migración figura con `finished_at` no nulo y `rolled_back_at` nulo, y coincide con las carpetas de `prisma/migrations/`;
  - que existen las tablas, columnas, enums e índices esperados, incluidos los índices únicos parciales;
  - que RLS está activado en todas las tablas de la app (`pg_tables.rowsecurity`) y que las políticas son las previstas (`pg_policies`);
  - que cada tabla de registros del bebé tiene el *trigger* `broadcast_household_change`, que ninguna tabla de la app está en la publicación `supabase_realtime` (`pg_publication_tables`) y que `realtime.messages` tiene particiones para hoy (sin ellas, `realtime.send` pierde las señales sin dar error; decisión 066).
- **Tras cambios de esquema o de seguridad:** revisar los *advisors* de seguridad y rendimiento del proyecto (`get_advisors`) y resolver los avisos antes de dar la tarea por cerrada.
- **Al depurar:** consultar los datos implicados con `SELECT` acotados y los logs del proyecto, antes de proponer cambios.
- **Al preparar datos de prueba:** solo en el proyecto de **desarrollo**.

**Límites no negociables:**

- **Solo lectura por defecto.** Las escrituras vía MCP solo se permiten en el proyecto de desarrollo y para datos de prueba. Nunca sobre producción sin confirmación explícita del usuario.
- **El esquema lo gestiona exclusivamente Prisma Migrate.**
  - No usar `apply_migration` ni DDL con `execute_sql` para cambiar el esquema: genera *drift* respecto a `prisma/migrations/`.
  - El SQL adicional (RLS, políticas, índices parciales, publicación) va dentro de una migración de Prisma (`prisma migrate dev --create-only` y editar el `migration.sql`).
- `list_migrations` del MCP de Supabase muestra las migraciones de la CLI de Supabase, **no** las de Prisma. La referencia de Prisma es `public._prisma_migrations`.
- **Prohibido sin confirmación explícita:**
  - `DROP`, `TRUNCATE`, y `DELETE` / `UPDATE` sin `WHERE`;
  - `prisma migrate reset`;
  - pausar o restaurar proyectos, y fusionar, reiniciar o borrar ramas.
- Identificar siempre el proyecto (`project_id`) y confirmar si es **dev** o **prod** antes de ejecutar cualquier consulta.
- Minimizar datos personales en el chat: columnas concretas y `LIMIT`; nunca volcados completos de tablas con datos reales.
- **Si no hay MCP activo:**
  1. Decirlo.
  2. Usar lo que Claude pueda ejecutar por sí mismo (`npx prisma migrate status`, scripts de verificación).
  3. Solo en último caso, pedir ayuda al usuario explicando por qué.

---

## 1. Contexto

- **Producto:** MVP mobile-first (PWA-ready) para registrar tomas, pañales, sueño, crecimiento y salud de un bebé, con un dashboard diario.
- **Usuarios:** los dos padres (y sus varios dispositivos), en el móvil, con una mano, a menudo de noche y cansados. **Ven y editan los mismos datos, sincronizados en tiempo real.**
- **Prioridad absoluta:** velocidad y fiabilidad del registro por encima de la riqueza de funciones.
- **Stack:**
  - Next.js 16 (App Router), React 19, TypeScript estricto
  - Tailwind CSS 4 y shadcn/ui
  - Prisma 7 + `@prisma/adapter-pg` sobre **Supabase PostgreSQL**
  - Supabase Auth y Realtime
  - Zod 4, React Hook Form, date-fns y Vitest

---

## 2. Reglas de arquitectura (Next.js App Router)

### 2.1 Server Components por defecto

- Todo componente es **Server Component** salvo que necesite estado, efectos, *event handlers*, APIs del navegador, temporizadores, suscripciones Realtime o hooks de formulario.
- `"use client"` se coloca **en la hoja más baja posible** del árbol. Las `page.tsx` y `layout.tsx` **nunca** son Client Components: componen Server Components que pasan datos a pequeñas islas cliente.
- Props de servidor a cliente: solo datos serializables y planos. Nada de funciones (excepto Server Actions), clases ni objetos con métodos.
- **Prohibido** cargar datos en Client Components con `useEffect` + `fetch` o con el cliente de Supabase. Los datos llegan como props desde el servidor.

### 2.2 Lecturas de datos

- Viven exclusivamente en `src/features/<módulo>/queries.ts`, que empieza con `import "server-only";`.
- Las páginas obtienen el contexto con `requireMember()` y hacen `await` de las queries pasándole `householdId` / `babyId`. **No** se crean Route Handlers (`app/api/*`) para consumo interno.
- Route Handlers solo cuando sea imprescindible: callback de Auth, exportaciones (CSV), webhooks.
- Toda query filtra por un `babyId` o `householdId` **ya autorizado** y, en listados, usa `select` con los campos estrictamente necesarios.
- Las páginas con datos son **dinámicas** (dependen de la sesión). Nunca cachear respuestas con datos entre usuarios ni prerenderizarlas en build.
- Lecturas independientes en paralelo con `Promise.all`; *streaming* con `<Suspense>` y `loading.tsx`.

### 2.3 Mutaciones: Server Actions

- **Todas** las escrituras pasan por Server Actions en `src/features/<módulo>/actions.ts` (`"use server";` al inicio del archivo). El cliente **nunca** escribe en la base de datos con `supabase-js`.
- Cada Server Action es un **endpoint público**: el parámetro de entrada se trata como `unknown`, se comprueba la sesión y la pertenencia a la familia, y se valida **siempre** con Zod en el servidor aunque el cliente ya haya validado.
- Plantilla obligatoria:

```ts
"use server";

export async function createDiaperChange(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const member = await requireMember(); // sesión + familia; sin sesión → UNAUTHENTICATED
  const parsed = createDiaperChangeSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  try {
    await assertBabyInHousehold(parsed.data.babyId, member.householdId);
    const diaperChange = await db.diaperChange.create({
      data: { ...parsed.data, createdById: member.userId }, // id: UUID generado en el cliente
      select: { id: true },
    });
    revalidatePath("/");
    revalidatePath("/diapers");
    return ok(diaperChange);
  } catch (error) {
    return handleActionError("createDiaperChange", error);
  }
}
```

- **Idempotencia:** las altas reciben el `id` (UUID) generado en el cliente. Si llega un duplicado por doble toque o reintento (`P2002` sobre la clave primaria), se responde `ok` con el registro existente, no con error.
- Tras cada mutación, `revalidatePath` de la lista afectada **y** del dashboard (`/`). Los demás dispositivos se enteran por Realtime (2.8).
- `redirect()` lanza una excepción interna: se llama **fuera** del `try/catch`, nunca dentro.
- Las reglas de negocio no triviales (prorrateo de sueño entre días, cálculo del resumen, sugerencia de pecho) van en `features/<módulo>/service.ts` como funciones puras y testeables. La action solo orquesta: autorizar → validar → servicio/Prisma → revalidar → responder.
- Operaciones que tocan varias filas (p. ej. parar una toma y empezar otra) van en `db.$transaction`.

### 2.4 Client Components y formularios

- **Formularios:** React Hook Form + `zodResolver(schema)` con el **mismo schema** que usa la action. El submit llama a la action dentro de `startTransition`; los `fieldErrors` del `ActionResult` se trasladan con `form.setError`.
- **Acciones de un toque** (pañal mojado, iniciar cronómetro): botón que genera el UUID (`crypto.randomUUID()`) e invoca la action con `useTransition`, y `useOptimistic` cuando mejore la sensación de inmediatez.
- **Cronómetros:** la fuente de verdad es `startedAt` en la BD (`endedAt = null` mientras está activo). El cliente solo pinta `now − startedAt` con un intervalo de 1 s. Nunca guardar el estado de un cronómetro solo en el cliente: debe sobrevivir al bloqueo del móvil, al cierre de la pestaña y, sobre todo, **verse y poder pararse desde el dispositivo del otro progenitor**.
- **Estado:** sin librerías de estado global en el MVP. Filtros (p. ej. el día seleccionado) en `searchParams`; estado de UI en local.
- **Feedback:** todo botón que dispara una action muestra estado pendiente y se deshabilita mientras tanto. Éxito → toast (`sonner`); error → mensaje junto al campo o toast; `UNAUTHENTICATED` → redirigir al login.

### 2.5 Fechas y zona horaria

- La BD guarda las fechas como `timestamptz` en **UTC**.
- "Hoy", "ayer" y los resúmenes diarios son el **día natural en la zona horaria del hogar** (`APP_TIMEZONE`, por defecto `Europe/Madrid`), calculado en el servidor con `@date-fns/tz`. **Prohibido** depender de la zona horaria implícita del servidor (p. ej. `new Date().setHours(0, 0, 0, 0)`; en Vercel el servidor está en UTC).
- Los valores de `<input type="datetime-local">` no llevan zona: el servidor los interpreta en `APP_TIMEZONE` (transformación en el schema Zod).
- Sesiones que cruzan la medianoche se reparten entre los días según el tramo que cae en cada uno.
- Todo el formato pasa por `src/lib/dates.ts` (locale `es`, formato 24 h: "14:30", "hace 25 min", "1 h 20 min"). Los tiempos relativos que cambian solos ("hace 5 min") se pintan en un Client Component que se actualiza, para evitar desajustes de hidratación.

### 2.6 Base de datos (Prisma 7 + Supabase PostgreSQL)

**Dos URLs de conexión obligatorias (estándar Supabase):**

| Variable | Conexión de Supabase | Puerto | La usa |
|---|---|---|---|
| `DATABASE_URL` | Supavisor en **modo transacción** + `?pgbouncer=true` | 6543 | La app en tiempo de ejecución: `PrismaPg` en `src/lib/db.ts` |
| `DIRECT_URL` | **Session pooler** (redes IPv4) o conexión directa (IPv6) | 5432 | La CLI de Prisma (`migrate`, `studio`) vía `prisma.config.ts` |

- **Particularidad de Prisma 7:** las URLs ya **no** van en `schema.prisma` (el `datasource` solo declara `provider = "postgresql"`) y `directUrl` ha desaparecido. Las dos variables se reparten así:
  - `prisma.config.ts` → `datasource: { url: env("DIRECT_URL") }`, para la CLI y las migraciones;
  - `src/lib/db.ts` → `new PrismaClient({ adapter: new PrismaPg({ connectionString: env.DATABASE_URL }) })`, para la app.
- Nunca usar `DIRECT_URL` en la app ni migrar a través del puerto 6543.
- Conectar con un **rol dedicado `prisma`** (guía oficial de Supabase), no con `postgres`.
- Prisma **7.x estable** (el tag `latest` de npm apunta a una RC de Prisma 8: no usarla). Generator `prisma-client` con `output` a `src/generated/prisma`. Cliente y tipos se importan **desde el output generado** (p. ej. `@/generated/prisma/client`), nunca desde `@prisma/client`. La carpeta generada no se edita y está en `.gitignore`.
- Singleton en `src/lib/db.ts` (`import "server-only"`, caché en `globalThis` en desarrollo para evitar múltiples instancias con el *hot reload*).
- **Solo** `features/*/queries.ts`, `features/*/actions.ts`, `features/*/service.ts` y `prisma/seed.ts` importan `db`. Los componentes nunca.

**Migraciones:**

- `prisma migrate dev --name <descripcion_snake_case>` **solo contra el proyecto de desarrollo**; en producción, `prisma migrate deploy`.
- Nunca `db push` ni editar migraciones ya aplicadas.
- El SQL que Prisma no modela (RLS, políticas, índices parciales, publicación Realtime, *grants*) se añade en la **misma migración** con `--create-only`.
- Tras aplicar, verificar vía MCP (regla 0.2).
- Todo cambio de esquema se propone primero explicando su impacto.

**Convenciones de esquema:**

- `id String @id @default(uuid()) @db.Uuid`, que acepta UUID generados en el cliente.
- `createdAt` / `updatedAt` en todos los modelos, como `@db.Timestamptz(3)`; las demás fechas también como `timestamptz`.
- Modelos PascalCase singular mapeados a tablas snake_case plural (`@@map("sleep_sessions")`) y campos camelCase mapeados a columnas snake_case (`@map("baby_id")`). Así el SQL de RLS y los filtros de Realtime quedan legibles.
- Registros del bebé con `babyId` (`onDelete: Cascade`), `createdById` (usuario de Supabase Auth) e índice `@@index([babyId, <campoFecha>])`.
- Medidas como **enteros con la unidad en el nombre**: `amountMl`, `weightGrams`, `lengthMm`, `headCircumferenceMm`. Excepción: `doseAmount` (`Float`, admite 2,5 ml).
- Enums nativos de PostgreSQL vía Prisma; Zod los valida igualmente en la entrada.

**Invariantes de concurrencia en la BD, no solo en el código:**

- Una sola toma de pecho activa y una sola siesta activa por bebé: índice único parcial (`... (baby_id) WHERE ended_at IS NULL`). Si la versión de Prisma no lo modela, va en SQL dentro de la migración.
- La violación (`P2002`) se traduce a `CONFLICT` con un mensaje útil ("Ya hay una siesta en curso, iniciada por Ana").
- Las paradas de cronómetro son idempotentes: `updateMany({ where: { id, endedAt: null } })`. Si no actualiza nada, otro dispositivo ya la paró: se devuelve el estado actual, no un error.
- Ediciones: *last write wins* en el MVP, mostrando quién editó por última vez.

**Otros:**

- Borrado físico en el MVP. "Deshacer" solo aplica a creaciones recientes (borra el registro recién creado).
- Dos proyectos de Supabase: **dev** (seed y pruebas) y **prod** (datos reales). El seed nunca se ejecuta contra prod. *(Hoy solo existe prod: el proyecto `baby-tracker`; ver decisión 068.)*

### 2.7 Autenticación y autorización (Supabase Auth)

- Supabase Auth con `@supabase/ssr`: clientes en `src/lib/supabase/server.ts` y `src/lib/supabase/client.ts`; refresco de sesión en `src/proxy.ts` (nombre de `middleware.ts` en Next.js 16).
- Método de acceso: **email + código OTP de 8 dígitos** (la longitud configurada en Supabase Auth; `OTP_LENGTH` en `features/auth/schemas.ts` debe coincidir). No se usan enlaces mágicos porque en iOS abren Safari y no la PWA instalada, y la sesión quedaría fuera de la app. Sesiones de larga duración.
- En el servidor, la identidad se valida con `supabase.auth.getClaims()` (o `getUser()`). **Nunca** confiar en `getSession()` en código de servidor.
- **Prisma se conecta con un rol que ignora RLS, así que la autorización en código es obligatoria:**
  - `requireMember()` en cada página y action;
  - toda query o mutación comprueba que el `babyId` o `householdId` pertenece al usuario;
  - los recursos de otra familia responden `NOT_FOUND`, sin revelar que existen.
- **RLS activado en todas las tablas de la app** (defensa en profundidad y requisito para Realtime):
  - políticas `SELECT` solo para miembros de la familia, mediante una función SQL `is_household_member(...)`;
  - **ninguna** política de `INSERT` / `UPDATE` / `DELETE`, porque las escrituras solo entran por el servidor;
  - la Data API (PostgREST) no expone las tablas de la app.
- Claves: en el cliente solo la **clave publicable** (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`). La clave secreta / `service_role` no se usa en el MVP; si algún día hiciera falta, solo en servidor y nunca con prefijo `NEXT_PUBLIC_`.
- Familia: el primer usuario crea la familia (`OWNER`) y genera un código de invitación de un solo uso y con caducidad; el otro progenitor se une con ese código (`MEMBER`).

### 2.8 Sincronización multi-dispositivo (Supabase Realtime)

- **Fuente de verdad única:** PostgreSQL, leído por los Server Components. Realtime es **solo una señal de invalidación**.
- Un único Client Component `RealtimeSync` (`features/sync/`) en el layout autenticado:
  - se une, con la sesión del usuario, al canal **privado** de Broadcast `household:<id>`;
  - un *trigger* en cada tabla de registros del bebé envía a ese canal solo `{table, op}`, nunca la fila;
  - la política RLS de `realtime.messages` decide quién entra (solo los miembros) y ningún cliente puede enviar.
- Al recibir una señal: *debounce* (~300 ms) y `router.refresh()`. **Prohibido** aplicar el *payload* al estado local o construir réplicas en el cliente.
- Al volver a primer plano (`visibilitychange` → `visible`) y al recuperar la red (`online`): `router.refresh()` y comprobar o restablecer la suscripción. Los navegadores móviles cierran los WebSockets en segundo plano.
- Indicador de conexión siempre visible cuando no está "en línea" (reconectando · sin conexión).
- **Sin escritura offline en el MVP:** sin conexión, los botones de registro se deshabilitan con un mensaje claro. Los UUID generados en el cliente dejan preparada una futura cola offline.
- Una tabla nueva de registros del bebé recibe el *trigger* `broadcast_household_change` en su migración. **No** se publica en `supabase_realtime`: los `DELETE` de `postgres_changes` llegan a cualquier cuenta sin filtro ni RLS (decisión 066).

### 2.9 Estructura de carpetas y dependencias entre capas

```
src/
├── proxy.ts          # Refresco de sesión de Supabase
├── app/              # Routing y composición. Sin lógica de negocio ni acceso a datos directo.
│   ├── (auth)/       # login, join
│   └── (app)/        # Pantallas autenticadas (RealtimeSync en la Fase 4)
│       ├── (tabs)/   # Con BottomNav: Hoy, historiales, Más y las pantallas que cuelgan de Más
│       └── (task)/   # Sin barra: formularios, ediciones e invitación (una tarea por pantalla)
├── features/<m>/     # schemas.ts · queries.ts · actions.ts · service.ts · labels.ts · components/
│   ├── auth/ · household/ · sync/
├── components/
│   ├── ui/           # shadcn/ui generado. Solo ajustes de estilo globales.
│   ├── layout/       # BottomNav, PageHeader…
│   └── shared/       # Componentes reutilizables entre módulos.
├── lib/              # supabase/, db.ts, env.ts, action-result.ts, dates.ts, utils.ts
└── generated/        # Prisma (no editar)
```

- `app/` → puede importar de `features/`, `components/`, `lib/`.
- `features/<m>/` → puede importar de `components/`, `lib/` y de `features/auth` (para `requireMember()`), **no** de otros módulos. Excepción: `features/dashboard/` puede leer las queries de los demás módulos.
- `components/` y `lib/` → no importan de `features/`.
- `schemas.ts` y `labels.ts` se usan en cliente: **nunca** importan nada `server-only`.

---

## 3. Convenciones de código

### 3.1 Nomenclatura (inglés en todo el código y la BD)

| Elemento | Convención | Ejemplo |
|---|---|---|
| Variables y funciones | camelCase | `lastFeeding`, `getDailySummary` |
| Componentes React | PascalCase | `FeedingTimer` |
| Archivos y carpetas | kebab-case | `feeding-timer.tsx` |
| Tipos | PascalCase, sin prefijo `I` | `DailySummary` |
| Constantes | SCREAMING_SNAKE_CASE | `QUICK_BOTTLE_AMOUNTS_ML` |
| Modelos Prisma | PascalCase singular | `SleepSession` |
| Campos Prisma | camelCase + unidad si aplica | `amountMl`, `weightGrams` |
| Tablas y columnas en PostgreSQL | snake_case (tablas en plural), vía `@@map` / `@map` | `sleep_sessions.baby_id` |
| Enums | PascalCase · valores SCREAMING_SNAKE | `DiaperType.WET` |
| Server Actions | verbo + entidad | `createFeeding`, `stopSleepSession` |
| Queries | `get*` (uno) · `list*` (varios) | `getActiveSleepSession`, `listFeedingsByDay` |
| Schemas Zod | `<acción><Entidad>Schema` | `createFeedingSchema` |
| Booleanos | `is` / `has` / `should` | `isActive`, `hasReaction` |
| Rutas URL | inglés, kebab-case | `/feeding/new`, `/diapers/[id]/edit` |
| Variables de entorno | SCREAMING_SNAKE; `NEXT_PUBLIC_` solo si son públicas | `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL` |
| Textos de UI | español | "Guardar toma" |

**Glosario de dominio (ES → EN), obligatorio para mantener nombres consistentes:**

| Español | Inglés |
|---|---|
| familia | `Household` |
| miembro de la familia | `HouseholdMember` |
| invitación | `HouseholdInvite` |
| registrado por | `createdById` |
| toma | `Feeding` |
| pecho izq. / der. | `BREAST_LEFT` / `BREAST_RIGHT` |
| biberón | `BOTTLE` |
| leche materna / fórmula | `BREAST_MILK` / `FORMULA` |
| pañal | `DiaperChange` |
| mojado / sucio / mixto | `WET` / `DIRTY` / `MIXED` |
| color / textura de heces | `stoolColor` / `stoolConsistency` |
| sueño / siesta | `SleepSession` |
| crecimiento | `GrowthMeasurement` |
| longitud | `length` |
| perímetro craneal | `headCircumference` |
| vacuna | `VACCINE` |
| medicamento | `MEDICATION` |
| reacción | `reaction` |
| resumen diario | `DailySummary` |

### 3.2 TypeScript estricto

- `tsconfig.json`: `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `forceConsistentCasingInFileNames`.
- **Prohibido:**
  - `any`: usar `unknown` y estrechar;
  - `@ts-ignore`: si es inevitable, `@ts-expect-error` con un comentario del motivo;
  - aserciones no nulas `!`;
  - `as`, salvo `as const` o casos justificados con comentario.
- **Tipos derivados, nunca duplicados:** `z.infer<typeof schema>` para entradas; tipos generados de Prisma para modelos y *payloads* con `select`.
- `switch` sobre enums siempre exhaustivo, con `assertNever(value)` en `default`.
- Tipo de retorno explícito en funciones exportadas (actions, queries, servicios, utilidades).
- Preferir `type` a `interface`. *Named exports* salvo donde Next.js exige `default` (`page`, `layout`, `loading`, `error`, `not-found`, `manifest`).
- Imports con el alias `@/`; nada de rutas relativas que suban más de un nivel (`../../`).

### 3.3 Manejo de errores

Contrato único para todas las Server Actions (`src/lib/action-result.ts`):

```ts
export type ActionErrorCode =
  | "VALIDATION"
  | "UNAUTHENTICATED"
  | "NOT_FOUND"
  | "CONFLICT"
  | "UNEXPECTED";

export type ActionError = {
  code: ActionErrorCode;
  message: string; // en español, apto para mostrar al usuario
  fieldErrors?: Record<string, string[]>;
};

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: ActionError };
```

- **Errores esperados** se **devuelven**, no se lanzan: validación, sesión caducada, registro inexistente o de otra familia, conflicto como "ya hay una siesta en curso".
- **Errores inesperados** se capturan en la frontera de la action con `handleActionError(actionName, error)`: `console.error` en el servidor con contexto (nombre de la acción e ids, sin datos de salud) y mensaje genérico al cliente. Nunca llegan al cliente mensajes de Prisma o de PostgreSQL ni *stack traces*.
- Errores conocidos de Prisma: `P2025` → `NOT_FOUND`; `P2002` → `CONFLICT`, salvo duplicado de clave primaria en un alta idempotente, que es éxito.
- Errores de renderizado: `error.tsx` por segmento (con botón "Reintentar"), `global-error.tsx` y `not-found.tsx`. En queries de detalle, `notFound()` si el recurso no existe o no pertenece a la familia.
- Prohibidos los `catch` vacíos y los errores silenciados.

### 3.4 Validación con Zod 4

- Un schema por caso de uso en `features/<m>/schemas.ts` (p. ej. `createFeedingSchema`, `updateFeedingSchema`), compartido entre cliente y servidor. Los IDs se validan con `z.uuid()`.
- Mensajes en español usando el parámetro `error` de Zod 4 (no el antiguo `message`). Para convertir errores en `fieldErrors`, `z.flattenError()`.
- Las reglas de dominio viven en el schema (`.refine` / `.superRefine`): `endedAt > startedAt`, sin fechas futuras, `amountMl` obligatorio si `type = BOTTLE`, al menos una medida en crecimiento, rangos plausibles.
- Cuidado con `z.coerce.number()`: convierte la cadena vacía en `0`. En campos numéricos de formulario, preprocesar `""` → `undefined`.
- Variables de entorno validadas con Zod en `src/lib/env.ts`, separando las de servidor y las públicas. El resto del código importa `env`, nunca `process.env` directamente.

### 3.5 Calidad y estilo

- ESLint (config de Next.js) + Prettier con `prettier-plugin-tailwindcss`.
- Componentes de ~150 líneas como máximo; si crecen, extraer subcomponentes.
- Los comentarios explican el **porqué**, no el qué.
- Sin código muerto ni `console.log` en commits (`console.error` solo en fronteras de error).
- Tests con Vitest para schemas, servicios, utilidades de fechas, autorización y concurrencia, junto al archivo probado: `*.test.ts` (unit, sin red ni base de datos) y `*.int.test.ts` (integración contra `baby_tracker_test`, con las factorías de `src/test/factories.ts`).
- Commits con Conventional Commits en inglés: `feat(feeding): add breast timer`, `fix(sleep): split sessions across midnight`.

### 3.6 Definición de "hecho"

- [ ] `npm run typecheck`, `npm run lint` y `npm test` pasan.
- [ ] Sin `any`, sin `!`, sin `@ts-ignore`.
- [ ] Toda entrada validada con Zod en el servidor y autorizada con `requireMember()` y la comprobación de familia.
- [ ] Si hubo cambios de esquema: migración aplicada en dev y verificada vía MCP (regla 0.2), con los *advisors* revisados.
- [ ] Si afecta a datos compartidos: probado con dos sesiones simultáneas (el cambio aparece en el otro dispositivo y no hay duplicados).
- [ ] Estados de carga, vacío, error y sin conexión diseñados.
- [ ] Probado a 375 px de ancho en modo claro y oscuro.
- [ ] Skills aplicables evaluadas y ejecutadas (regla 0.1), e indicadas en el resumen.
- [ ] Roadmap de `README.md` actualizado.

---

## 4. Reglas de diseño (UI/UX)

### 4.1 Mobile-first

- Se diseña para **360–390 px** de ancho. Los estilos base son los de móvil; los breakpoints (`sm:`, `md:`) solo añaden, nunca al revés.
- Contenedor principal: `mx-auto w-full max-w-md px-4`. En escritorio la app es una columna móvil centrada.
- Respetar las *safe areas* de iOS (`env(safe-area-inset-bottom)`) en la barra inferior y los botones fijos.
- Sin scroll horizontal. Comprobar siempre a 375 × 667 y 390 × 844.

### 4.2 Ergonomía táctil (una mano, poca luz)

- Objetivo táctil mínimo **48 × 48 px** (`h-12`). Acciones principales `h-14` o mayor y a ancho completo.
- Acciones principales en la mitad inferior de la pantalla (zona del pulgar). En formularios, el botón primario va fijo abajo.
- Navegación inferior fija con 5 destinos: **Hoy · Tomas · Pañales · Sueño · Más** (Crecimiento, Salud, Ajustes).
- Acciones frecuentes en **≤ 3 toques** desde "Hoy".
- Valores por defecto en todo formulario: hora = ahora, siguiente pecho sugerido, última cantidad de biberón, y atajos de hora ("Ahora", "−5 min", "−15 min", "−30 min").
- Preferir **botones grandes de selección** (`ToggleGroup`, rejilla de opciones) a `<select>` y al teclado. El teclado solo para números (`inputMode="numeric"` / `"decimal"`) y notas.
- Inputs con tamaño de fuente ≥ 16 px (evita el zoom automático de iOS). El código OTP usa `InputOTP` con `inputMode="numeric"` y `autoComplete="one-time-code"`.
- Ningún gesto oculto como única vía (p. ej. deslizar para borrar): siempre hay un botón visible.

### 4.3 Pantallas simples en lugar de modales

- Cada alta o edición es **una ruta propia** (`/feeding/new`, `/diapers/[id]/edit`) con un botón "Atrás" claro. Así funcionan el botón atrás de Android y del navegador, los enlaces directos y la accesibilidad, con menos estado en el cliente.
- **Prohibido en el MVP:** formularios dentro de `Dialog` / `Sheet` / `Drawer`, modales anidados y rutas interceptadas o paralelas para simular modales.
- **Permitido:** `AlertDialog` solo para confirmar acciones destructivas (borrar) y toasts para feedback. Como mucho, un campo para **teclear la confirmación** de un borrado irreversible (el nombre del bebé al eliminar la familia; decisión 071): es una confirmación, no un formulario de datos.
- Una tarea por pantalla y un único botón primario por pantalla.
- Tras guardar: volver a la pantalla de origen ("Hoy" o el historial del módulo) con toast de confirmación y opción "Deshacer".

### 4.4 Lenguaje visual

- shadcn/ui como base, personalizado **solo mediante tokens CSS** (`globals.css`, `@theme`). Prohibidos los colores *hardcodeados* (`bg-[#…]`, `text-[#…]`).
- Un token de color por módulo (alimentación, pañales, sueño, crecimiento, salud) para reconocerlos de un vistazo, **siempre acompañado de icono y texto**.
- **Modo oscuro desde el día 1** (uso nocturno): sigue `prefers-color-scheme` con interruptor manual; fondos oscuros sin blancos puros ni brillos intensos.
- Tipografía base de 16 px; cifras clave grandes (`text-3xl` o más) con `tabular-nums` en cronómetros y cantidades.
- No transmitir información solo con color (color de heces: muestra + nombre).
- Contraste WCAG AA, foco visible, `aria-label` en botones de solo icono, respeto a `prefers-reduced-motion`.
- Todos los estados diseñados: vacío (con llamada a crear el primer registro), cargando (skeleton), error (con reintento), éxito (toast) y **sin conexión** (aviso discreto y registros deshabilitados).
- Datos compartidos: la autoría se muestra discreta ("por Ana") en historiales y en la última toma. Los cambios llegados por Realtime se integran sin saltos bruscos ni pérdida del scroll.
- Iconos `lucide-react` de al menos 20 px dentro de botones.
- Microcopy en español, cercano y breve, tuteando. Botones con verbos: "Guardar toma", "Iniciar siesta", "Parar".
- Los componentes de `components/ui/` no se modifican para casos concretos: la composición específica va en `features/<m>/components/`.

---

## 5. Seguridad y privacidad

- Son **datos de salud de un menor alojados en la nube**:
  - proyecto de Supabase en una **región de la UE**;
  - acceso solo para miembros autenticados de la familia (2.7);
  - ningún otro tercero (analítica, logs externos, fuentes con rastreo) en el MVP.
- Autorización en código en cada query y action (Prisma ignora RLS) + RLS en todas las tablas + Data API sin exponer las tablas.
- Revisar los *advisors* de seguridad de Supabase tras cada cambio de esquema (regla 0.2).
- Secretos solo en `.env` en local y en las variables de entorno de la plataforma de despliegue. Nunca en el repositorio. `.env.example` sin valores reales.
- Las credenciales de base de datos (`DATABASE_URL`, `DIRECT_URL`) son de servidor: nunca con prefijo `NEXT_PUBLIC_` ni en el bundle del cliente.
- El service worker nunca cachea respuestas con datos del usuario.
- Toda entrada se valida en el servidor: las Server Actions son endpoints públicos.

---

## 6. Comandos

| Comando | Uso |
|---|---|
| `npm run dev` | Desarrollo |
| `npm run build` / `npm start` | Build y producción |
| `npm run typecheck` | `next typegen` + `tsc --noEmit` (decisión 035) |
| `npm run lint` / `npm run format` | ESLint / Prettier |
| `npm test` | Vitest: unit + integración (`test:unit` / `test:int` por separado) |
| `npm run test:db` | Crear y migrar `baby_tracker_test` (base de datos aparte; hoy dentro del proyecto de producción, decisión 068) |
| `npx prisma migrate dev --name <nombre>` | Nueva migración (**solo proyecto dev**; hoy no existe, decisión 068) |
| `npx prisma migrate dev --create-only --name <nombre>` | Crear la migración sin aplicarla, para añadir SQL (RLS, índices parciales…) |
| `npx prisma migrate deploy` | Aplicar migraciones en **prod** |
| `npx prisma migrate status` | Estado de las migraciones |
| `npx prisma db seed` | Datos de ejemplo (**solo dev**) |
| `npx prisma studio` | Explorar la BD |

---

## 7. Registro de decisiones

Añadir una fila por cada decisión de arquitectura nueva o modificada. No borrar filas: si una decisión cambia, se marca como sustituida y se añade otra.

| # | Fecha | Decisión | Motivo |
|---|---|---|---|
| 001 | 2026-10-07 | Server Actions para todas las mutaciones; sin API REST interna. | Menos código y tipado de extremo a extremo. |
| 002 | 2026-10-07 | Arquitectura por módulos en `src/features/<m>/`; `app/` solo enruta. | Cohesión por dominio y límites claros entre capas. |
| 003 | 2026-10-07 | Altas y ediciones en pantallas propias; sin modales con formularios. | Uso con una mano, botón atrás nativo y accesibilidad. |
| 004 | 2026-10-07 | ~~SQLite en un servidor Node.js con disco persistente; nada de serverless.~~ **Sustituida por 011.** | — |
| 005 | 2026-10-07 | Cronómetros persistidos en BD (`endedAt = null` = activo). | Sobreviven al bloqueo del móvil y se comparten entre dispositivos. |
| 006 | 2026-10-07 | Fechas en UTC; días calculados en `APP_TIMEZONE`. | Resúmenes diarios correctos sea cual sea la zona del servidor. |
| 007 | 2026-10-07 | Medidas como enteros con la unidad en el nombre (g, mm, ml). | Sin errores de coma flotante ni ambigüedad de unidades. |
| 008 | 2026-10-07 | Prisma 7 estable, no la RC de Prisma 8. | El tag `latest` de npm apunta a una RC. |
| 009 | 2026-10-07 | React Hook Form + `zodResolver` con el mismo schema que el servidor. | Integración estándar de shadcn/ui y una sola fuente de validación. |
| 010 | 2026-10-07 | Uso proactivo y obligatorio de las skills del entorno en cada paso (regla 0.1). | Calidad Senior consistente y evitar soluciones genéricas desde cero. |
| 011 | 2026-10-07 | Supabase (PostgreSQL gestionado, región UE) sustituye a SQLite. | Datos sincronizados en tiempo real entre los móviles de ambos padres. |
| 012 | 2026-10-07 | Dos URLs: `DATABASE_URL` (pooler transaccional :6543, app vía `PrismaPg`) y `DIRECT_URL` (session pooler o directa :5432, CLI vía `prisma.config.ts`). | Estándar de Supabase; en Prisma 7 `directUrl` ya no existe y la separación se hace entre CLI y adapter. |
| 013 | 2026-10-07 | Supabase Auth (email + código OTP) entra en el MVP, con familias e invitaciones. | Datos de salud de un menor en la nube; Realtime y RLS requieren usuarios autenticados. OTP en vez de enlace mágico por la PWA en iOS. |
| 014 | 2026-10-07 | Autorización en el servidor + RLS en todas las tablas (solo `SELECT` para miembros) + Data API sin exponer las tablas. | Prisma ignora RLS; RLS como defensa en profundidad y como filtro de Realtime. |
| 015 | 2026-10-07 | Realtime ~~(`postgres_changes`)~~ como señal de invalidación → `router.refresh()`; nunca como fuente de datos. **Transporte sustituido por 066** (Broadcast privado); el principio sigue vigente. | Una sola ruta de lectura y ningún estado divergente entre dispositivos. |
| 016 | 2026-10-07 | UUID generados en el cliente + índices únicos parciales + paradas idempotentes. | Idempotencia y concurrencia segura entre dos padres; prepara una futura cola offline. |
| 017 | 2026-10-07 | MCP de Supabase obligatorio para inspeccionar y verificar la BD (regla 0.2); el esquema solo cambia con Prisma Migrate. | Verificación sin pasos manuales del usuario y sin *drift* de esquema. |
| 018 | 2026-10-07 | Proyectos de Supabase separados para dev y prod. **En suspenso por la 068** hasta crear un proyecto dev nuevo. | El seed y las pruebas nunca tocan datos reales. |
| 019 | 2026-10-07 | shadcn/ui sobre **Base UI** (`@base-ui/react`), estilo `base-maia`, con iconos `lucide-react` en lugar de los Hugeicons del preset. | Opción por defecto y mantenida de la CLI 4 de shadcn; Maia da espaciado generoso para uso táctil; Lucide por la regla 4.4. |
| 020 | 2026-10-07 | Formularios con `Field` + `Controller` de React Hook Form en lugar del componente `Form` de shadcn. | `Form` solo existe en la variante Radix antigua; `Field` es la integración actual documentada por shadcn (sigue siendo RHF + `zodResolver`). |
| 021 | 2026-10-07 | Cache Components activado (`cacheComponents: true`, por defecto en Next.js 16.4). Todo acceso a cookies o BD va dentro de `<Suspense>` / `loading.tsx`, y `"use cache"` nunca se aplica a datos de usuario. | Estructura estática sin datos del usuario que carga al instante + datos dinámicos en *streaming*; encaja con la PWA (regla 2.2). |
| 022 | 2026-10-07 | Modo oscuro con `next-themes` (`attribute="class"`, `defaultTheme="system"`). | La exige el `Toaster` de shadcn; evita el destello de tema y deja preparado el interruptor manual. |
| 023 | 2026-10-07 | ESLint aplica las reglas 3.2 y 3.5: `no-explicit-any`, `no-non-null-assertion`, `ban-ts-comment`, `consistent-type-definitions: type` y `no-console` (salvo `error`). | Las reglas se comprueban en `npm run lint`, no solo en revisión. |
| 024 | 2026-10-07 | `shadcn` como `devDependency`; el paquete `cn` (oficial de shadcn) sustituye a `clsx` + `tailwind-merge`. | `shadcn/tailwind.css` solo se usa al compilar; una dependencia en lugar de dos. |
| 025 | 2026-10-07 | Tokens de color por módulo (`--<módulo>` y `--<módulo>-soft`) protegidos por un test de contraste WCAG AA (`theme-tokens.test.ts`). | Ningún ajuste de color puede bajar del contraste AA sin que falle `npm test`. |
| 026 | 2026-10-07 | ~~El proyecto Supabase `baby-tracker` (eu-west-3) es el entorno **dev**; el de prod se crea antes del despliegue (Fase 4).~~ **Sustituida por 068.** | Hoy solo existe un proyecto; las migraciones y el seed de la Fase 1 van contra dev. |
| 027 | 2026-10-08 | **Excepción acotada a la regla 0.2:** `prisma/platform/supabase-bootstrap.sql` se ejecuta una vez por proyecto como `postgres` (vía MCP). Crea `private.auth_uid()` (proxy de `auth.uid()`), `private.add_table_to_realtime()` (`SECURITY DEFINER`, solo ejecutable por `prisma` y solo para tablas de `public` suyas) y revoca `EXECUTE` sobre `rls_auto_enable()`. Todo lo demás (tablas, RLS, políticas, permisos, publicación) sigue en Prisma Migrate. | El rol `prisma` no puede usar el esquema `auth`, alterar `supabase_realtime` ni revocar sobre funciones de `postgres`. Nada de esto lo modela Prisma, así que no genera *drift*. |
| 028 | 2026-10-08 | Índices únicos parciales con la *preview feature* `partialIndexes` de Prisma 7.10 (`@@unique(..., where: ...)`). | Prisma los conoce: no los borra en la siguiente migración, a diferencia del SQL a mano. |
| 029 | 2026-10-08 | RLS con funciones `SECURITY INVOKER` (`is_household_member`, `is_baby_household_member`, `search_path=''`). `SELECT` a `authenticated` solo en `household_members`, `babies` y los 5 registros; `anon` sin permisos. CHECK de integridad en la migración. | Sin saltarse RLS ni recursión; mínimo privilegio para Realtime; defensa en profundidad que Prisma no toca. |
| 030 | 2026-10-08 | `migrations.initShadowDb` con *stubs* de los objetos del bootstrap (requiere `experimental.externalTables`). Prisma lee `.env` con `process.loadEnvFile` de Node, sin `dotenv`. | La base de datos temporal de Prisma no tiene los objetos de Supabase; una dependencia menos. |
| 031 | 2026-10-08 | `HouseholdMember.userId` único (una familia por usuario en el MVP), `updatedById` en todos los registros y sin FK a `auth.users`. | `requireMember()` resuelve la familia con una sola búsqueda; la regla 2.6 exige mostrar quién editó; Prisma no gestiona `auth` y borraría la FK. |
| 032 | 2026-10-08 | Conexión a la BD siempre cifrada (TLS); verificación completa del certificado con `DATABASE_CA_CERT`, obligatoria si `VERCEL_ENV=production`. | Supabase acepta conexiones sin cifrar por defecto y son datos de salud de un menor. |
| 033 | 2026-10-08 | Variables de entorno en dos módulos: `src/lib/env.ts` (`server-only`, sin `DIRECT_URL`, `DATABASE_URL` obligada al puerto 6543) y `src/lib/public-env.ts` (solo `NEXT_PUBLIC_*`, para el cliente). | Next.js solo inyecta las `NEXT_PUBLIC_*` referenciadas literalmente; la app no puede usar `DIRECT_URL` por error. |
| 034 | 2026-10-08 | Login en dos pasos dentro de `/login` (el email vive en estado del cliente, no en la URL), con *actions* `requestEmailOtp` / `verifyEmailOtp` / `signOut`. `requireMember()` redirige a `/login` sin sesión y a `/join` sin familia. Cliente Supabase de solo lectura en Server Components. | Ningún dato personal en la URL ni en los logs; el refresco de sesión ocurre en `proxy.ts`. |
| 035 | 2026-10-08 | `npm run typecheck` = `next typegen && tsc --noEmit`. | Los tipos de rutas de Next (`LayoutProps`, `PageProps`) se regeneran antes de comprobar. |
| 036 | 2026-10-08 | El código OTP de email tiene **8 dígitos** (sustituye a los 6 de la regla 2.7 original). `OTP_LENGTH` es la única fuente en el código y las casillas de `InputOTP` se reparten el ancho. | Es la longitud que envía Supabase Auth en este proyecto; 8 casillas fijas de 48 px no caben en 375 px. |
| 037 | 2026-10-08 | Tests de integración contra `baby_tracker_test`, una base de datos aparte dentro del proyecto **dev** (`npm run test:db`, con guarda de proyecto). Vitest con proyectos `unit` (su `DATABASE_URL` no apunta a nada) e `integration` (`*.int.test.ts`, en serie); `npm test` ejecuta ambos. | No hay Docker; PGlite exige un adaptador de la comunidad desfasado y no prueba concurrencia real. Postgres 17 real sin dependencias nuevas. |
| 038 | 2026-10-08 | Autorización permanente para `TRUNCATE public.households CASCADE` antes de cada test de integración, **solo** en `baby_tracker_test` y tras `assertTestDatabase(current_database())`. Excepción acotada a la regla 0.2. | Cada test parte de una base vacía; la guarda impide tocar datos de dev o prod. |
| 039 | 2026-10-08 | `NotFoundError` (en `lib/action-result.ts`) para las comprobaciones de autorización; `handleActionError` lo traduce al mismo `NOT_FOUND` que `P2025`. `assertBabyInHousehold()` responde igual a ids ajenos, inexistentes o mal formados. | Ningún recurso de otra familia es distinguible de uno que no existe (regla 2.7). |
| 040 | 2026-10-08 | `requireBaby()` es el punto de entrada de las páginas de módulos; el bebé del MVP es el primero creado en la familia (`getPrimaryBaby`). | Una sola llamada da miembro y bebé; el esquema ya admite varios bebés para el selector del backlog. |
| 041 | 2026-10-08 | El paquete es **ESM** (`"type": "module"`). Los archivos que carga la configuración de Vitest importan con extensión `.ts` explícita (`allowImportingTsExtensions`, válido porque `noEmit`). | Vite pasará a cargar la configuración con el ESM nativo de Node, que no acepta sintaxis ESM en paquetes CommonJS ni imports relativos sin extensión. |
| 042 | 2026-10-08 | El aviso de seguridad de Supabase *Leaked Password Protection Disabled* se **acepta como falso positivo**. | La app solo autentica con código OTP por email: no existe ningún flujo con contraseña que comprobar. Revisar si algún día se añaden contraseñas. |
| 043 | 2026-10-08 | **ADR-043, códigos de invitación:** 10 caracteres Crockford Base32 (50 bits, `crypto.randomInt`), formato `ABCDE-FGHJK` y normalización de lo tecleado; solo `SHA-256` en `household_invites.code_hash`, el código se muestra una vez; 24 h y un solo uso (un código nuevo revoca los pendientes); máximo 2 miembros por familia; canje en una transacción con `SELECT … FOR UPDATE` de la familia; código desconocido, caducado o usado reciben la misma respuesta. | Es una credencial al portador sobre datos de salud de un menor: nada guardado sirve para entrar, adivinarlo es inviable sin limitar intentos y dos canjes simultáneos dan exactamente un miembro. Plan: `docs/superpowers/plans/2026-10-08-fase2-tarea2-familia.md`. |
| 044 | 2026-10-08 | `requireUserId()` (sesión sin exigir familia) para crear o unirse a una familia; `requireMember()` se apoya en ella. `createHousehold` crea familia, OWNER y bebé en un solo `create` anidado y es idempotente ante doble toque o si el usuario ya tiene familia. | El onboarding ocurre antes de tener familia; un solo insert anidado es atómico sin transacción interactiva. |
| 045 | 2026-10-08 | Tests de Server Actions: integración contra `baby_tracker_test` con la sesión simulada (`src/test/session-double.ts`, que se pasa tal cual a `vi.mock`) pero la pertenencia leída de la BD real; los fallos de infraestructura (BD caída) se prueban en unit con dobles. | La autorización y la concurrencia se ejercitan de verdad; los caminos de error que no se pueden provocar contra una BD real siguen cubiertos. |
| 046 | 2026-10-08 | Onboarding en pantallas propias: `/join` (elegir), `/join/create` y `/join/code`, protegidas por `requireNoHousehold()`; invitación en `/settings/invite`. El código vive solo en la memoria del cliente y se comparte como texto, **nunca dentro de una URL**. No se pide el sexo del bebé. Tras crear la familia se va a `/`, con la tarjeta "Invita al otro progenitor". | Una tarea por pantalla (regla 4.3); el código es una credencial al portador (ADR-043); minimización de datos (RGPD); se puede registrar sin esperar a la invitación. Plan: `docs/superpowers/plans/2026-10-08-fase3-tarea1-onboarding.md`. |
| 047 | 2026-10-08 | `useOnlineStatus()` (`useSyncExternalStore`; en el servidor, "en línea") y `SubmitButton`, que se deshabilita sin conexión con un aviso, antes de que exista `RealtimeSync`. | Regla 2.8 desde la primera pantalla con escritura, sin dependencias nuevas; la Fase 4 reutiliza el mismo hook. |
| 048 | 2026-10-08 | `error.tsx` por grupo de rutas con `retry()` (API de Next 16.4; sustituye a `reset`) sobre un `ErrorState` compartido. Base de UI compartida: `PageHeader`, `FormFooter` (pie fijo que lleva la *safe area*), `TextField`, `FormSkeleton` y `LinkCard`. | Errores con reintento (regla 3.3) y una sola implementación de los patrones táctiles de la regla 4.2. |
| 049 | 2026-10-08 | Esquemas paramétricos por zona horaria (`diaperChangeSchemas(timeZone)`…): el servidor pasa `env.APP_TIMEZONE` y la página pasa la zona al formulario. Los formularios usan `zodResolver(schema, undefined, { raw: true })`: envían el texto sin convertir y el servidor convierte una sola vez. **Excepción a la regla 3.2:** estas fábricas infieren su tipo de retorno. Bloques comunes en `lib/record-fields.ts` (`localDateTime` con 5 min de tolerancia al futuro, `formNumber`, `optionalText`, `recordId`, `checkSessionTimes`). | La conversión y "sin fechas futuras" viven en el esquema, exactos en cliente y servidor (regla 2.5), sin hacer pública la zona y con la puerta abierta a una zona por familia. Escribir a mano los genéricos de Zod añade ruido, no seguridad. |
| 050 | 2026-10-08 | Altas idempotentes con `insertOnce` (`lib/records.ts`): ante `P2002`, si el id existe **dentro de la familia** es un reintento (`ok`); si no, otro índice único (`CONFLICT`) o un id ajeno (`NOT_FOUND`). Ediciones y borrados en una sola sentencia acotada a la familia (`updateMany`/`deleteMany` con `baby: { householdId }`); el borrado responde `ok` aunque el registro ya no exista. Campos incoherentes se descartan en silencio (color y textura en un pañal `WET`, número de dosis en un medicamento); dosis sin unidad, o al revés, es `VALIDATION`. | Sin interpretar el `meta` del error del *adapter*; ningún hueco entre comprobar y escribir; un registro ajeno es indistinguible de uno inexistente; registro rápido a una mano sin errores por restos del formulario. |
| 051 | 2026-10-08 | Cronómetros: el índice único parcial es **la única barrera** (no hay comprobación previa) y su conflicto se responde con `CONFLICT` y el autor ("iniciada por Ana / por ti", con `getMemberDisplayName`, que solo nombra a miembros de la misma familia). Inicio con la hora del servidor; un `startedAt` adelantado se recorta a ella. Parada idempotente con `updateMany({ where: { id, endedAt: null } })` y `wasAlreadyStopped`. Solo se editan sesiones terminadas (la condición va dentro del `updateMany`). `switchFeedingSide` en `$transaction` (misma marca de tiempo; si el alta falla, se deshace la parada; si el otro progenitor ya la paró, igualmente inicia el pecho contrario). Borrar una sesión activa libera el hueco. Los biberones son puntuales (`endedAt` nulo) y nunca cuentan como "en curso". Editar una toma puede cambiar su tipo, limpiando los campos del anterior. | Dos padres y varios dispositivos sin condiciones de carrera: decide PostgreSQL. Probado con colisiones reales (`Promise.all`) y pruebas de mutación de cada barrera. |
| 052 | 2026-10-08 | Crecimiento: entrada en kg y cm (coma decimal admitida), almacenamiento en g y mm enteros redondeados; rangos plausibles hasta tres años (0,5–30 kg, 25–130 cm, 20–60 cm). | Las unidades del pediatra en la UI y enteros sin coma flotante en la BD (decisión 007). |
| 053 | 2026-10-08 | Pertenencia a un día: los eventos (pañal, biberón, medida, dosis) por su hora; las sesiones (sueño, pecho) por solapamiento, apareciendo en los dos días. El resumen cuenta cada registro en su día de inicio y reparte las duraciones por tramos (una sesión activa cuenta hasta ahora); `MIXED` cuenta como mojado y como sucio. Las búsquedas por solapamiento se acotan con `SESSION_LOOKBACK_MS` (24 h) sobre el índice `(baby_id, started_at)`, más la sesión activa. | Regla 2.5 aplicada de forma uniforme: un sueño de 23:00 a 01:00 suma 60 min a cada día; el historial de cada módulo y "Hoy" coinciden; la consulta nunca recorre todo el historial. |
| 054 | 2026-10-08 | Dos grupos de rutas autenticadas: `(app)/(tabs)` con `BottomNav` (Hoy · Tomas · Pañales · Sueño · Más, más Crecimiento, Salud y Ajustes, que cuelgan de Más) y `(app)/(task)` sin barra para formularios, ediciones e invitación. Layouts estáticos (cada página comprueba la sesión). La pestaña activa se lee con `useSelectedLayoutSegment()` en una única hoja cliente, envuelta en `<Suspense>` con la misma barra sin pestaña marcada como *fallback*. "Más" es una pantalla (`/more`), no un menú. `--bottom-nav-height` y `env(safe-area-inset-*)` en los tres layouts. | Botón primario de los formularios realmente abajo y sin toques accidentales en la barra; decisión en el servidor, sin condicionales de ruta en el cliente. Con Cache Components, leer el segmento se suspende bajo parámetros dinámicos desconocidos y sin `Suspense` el build falla. Con `viewport-fit=cover`, la PWA en iOS dibuja bajo la barra de estado. Plan: `docs/superpowers/plans/2026-10-08-fase3-tarea2-layout-base.md`. |
| 055 | 2026-10-09 | Accesibilidad del sistema visual: `--ring` claro a `oklch(0.556 0 0)` (4,7:1; antes 2,59:1) y anillos de foco a opacidad completa en los componentes propios sin borde (barra inferior, `LinkCard`), con un test de contraste del anillo en `theme-tokens.test.ts`. En las pantallas que cuelgan de Más, la pestaña lleva `aria-current="true"` (sección actual), no `"page"`. Con `prefers-reduced-motion`, los esqueletos no laten (regla global en `globals.css`, sin tocar `components/ui`). Los avisos (`sonner`) flotan por encima de la barra con `--toast-offset-bottom`. | WCAG 1.4.11 (foco 3:1), 4.1.2 y 2.3.3, medidos en el navegador y no solo en código; los ajustes van por tokens y estilos globales (regla 4.4). |
| 056 | 2026-10-09 | Registro de un toque: Mojado, Sucio y Mixto se guardan al instante con la hora del servidor, desde una barra fija sobre la `BottomNav` (`data-sticky-actions`, que eleva también los avisos). El doble toque se corta en el cliente con un `ref` síncrono y los botones deshabilitados mientras dura la acción. "Deshacer" en un aviso de 6 s (`offerUndo`) borra el registro recién creado. El color y la textura se añaden después desde el historial. Los días pasados se ven con `?day=` (`resolveDay`: un valor inválido o futuro es hoy), sin botones de un toque; una edición vuelve al día del registro. | Velocidad de captura a una mano (regla 4.2) sin duplicados: cada toque lleva su propio UUID, así que la idempotencia del servidor no distingue un doble toque de dos pañales. Plan: `docs/superpowers/plans/2026-10-09-fase3-tarea3-panales.md`. |
| 057 | 2026-10-09 | Piezas de formulario compartidas: `ChoiceGrid` con radios nativos en `fieldset`/`legend` (la opción elegida lleva borde, fondo y ✓) y opción "Sin indicar" en los campos opcionales; `DateTimeField` con atajos calculados en la zona del hogar (`timeZone` como prop); `DayNav`; campos comunes de alta y edición con `FormProvider` y `useFormContext`. Tokens `--stool-*` sin variante oscura (representan el color real) y con borde. `Textarea` generado por la CLI de shadcn. Autoría con `authorLabel` y `describeAuthorship` (`lib/authors.ts`). Sin Testing Library por ahora: la lógica va en funciones puras con test y la interacción se valida en el navegador. | Botones grandes en vez de `<select>` o teclado (regla 4.2) con la semántica y el teclado de los controles nativos; una sola implementación para Tomas y Sueño; sin dependencias nuevas. |
| 058 | 2026-10-09 | Confirmaciones destructivas en rojo sólido (`bg-destructive` con `text-background`), no con la variante `destructive` tintada de shadcn; el rojo como texto sobre la página queda protegido por `theme-tokens.test.ts`, igual que el token de cada muestra `--stool-*` (un color sin token compila, pero su muestra saldría invisible). Los nombres accesibles conservan el texto visible y añaden la explicación como texto oculto ("−5 min, hace 5 minutos"). | WCAG 1.4.3 (la variante tintada daba 3,99:1 en claro) y 2.5.3 (el control por voz usa lo que se ve); medido, no supuesto. |
| 059 | 2026-10-09 | UI de Tomas: barra fija con dos estados. Sin toma en curso: Pecho izq. · Pecho der. (el sugerido, `suggestNextBreast`, relleno y con "Sugerido" en su nombre) · Biberón. En curso: lado, autor, cronómetro y "Cambiar de pecho" / "Parar". El cronómetro (`ElapsedTime`) pinta `now − startedAt` de la BD cada segundo, con el primer pintado a la hora del servidor (`serverNow`, sin desajuste de hidratación) y el desfase de reloj del dispositivo corregido; el intervalo vive en un `useEffect` con limpieza. Biberón en dos toques con un formulario precargado con la última cantidad y el último tipo de leche (`getLastBottleFeeding`). Un único formulario de alta y edición con el tipo como selector; una toma en curso no se edita (aviso). `RefreshOnFocus` en `(app)/layout.tsx` refresca al volver a primer plano o al recuperar la red. | Ambos padres ven y paran el mismo cronómetro (regla 2.4); los conflictos los decide la BD (decisión 051) y la UI los explica y refresca; sin `RealtimeSync` aún, un navegador móvil congelado en segundo plano no vería la toma del otro. |
| 060 | 2026-10-09 | Piezas compartidas extraídas al aparecer el segundo uso: `useSingleFlight` (compuerta síncrona + estado ocupado: un doble toque nunca lanza dos acciones, porque cada toque lleva su propio UUID), `offerUndo` (aviso de 6 s con Deshacer que recibe la acción) y `DeleteRecordButton` (`AlertDialog` en rojo sólido que recibe la Server Action como prop, permitido por la regla 2.1). Los valores iniciales de los formularios de edición son `DefaultValues` (parciales): un dato que falte lo elige el usuario, nunca se inventa. | Una sola implementación de las barreras de concurrencia y de borrado para Pañales, Tomas y Sueño; tipos derivados de los esquemas en lugar de tipos planos duplicados. |
| 061 | 2026-10-09 | `useFocusRecovery` (`lib/`) en las barras cuyos botones cambian con la acción (iniciar ↔ parar): si el control enfocado sale del DOM y el foco cae a `<body>`, vuelve al primer control habilitado de la barra. Se detecta porque el último elemento enfocado ya no está conectado, no con `blur`. Las unidades dibujadas dentro de un campo (`aria-hidden`) se repiten como texto oculto en su etiqueta. | WCAG 2.4.3 y 1.3.1 tras la revisión de Tomas; los navegadores no coinciden en disparar `blur` al retirar el elemento enfocado; un toque que no enfocó nada (iOS) no mueve el foco. Sueño reutiliza el mismo hook. |
| 062 | 2026-10-09 | Sueño: «hace 5 / 10 / 15 min» envía `minutesAgo` y el **servidor** lo resta de su reloj (`resolveSleepStart`, puro); un inicio en el pasado nunca empieza antes del final del sueño anterior, y el aviso muestra la hora guardada. `StickyActionBar` (barra fija, aviso sin conexión, recuperación de foco) compartida por Pañales, Tomas y Sueño; mide su altura con `ResizeObserver` y la publica en `--sticky-actions-height`. `ElapsedTime` pasa a `components/shared`. Textos: «siesta» para toda sesión y «de sueño» para el tiempo, sin palabras con género. | Sin desfase del reloj del móvil, redondeo al minuto ni hora ambigua en el cambio de horario; sin solapes que cuenten dos veces el sueño del día; los avisos con «Deshacer» ya no tapan una tarjeta en curso; «sueños» se leería como *dreams* y no se pide el sexo del bebé (decisión 046). Plan: `docs/superpowers/plans/2026-10-09-fase3-tarea5-sueno.md`. |
| 063 | 2026-10-09 | Crecimiento y Salud: historiales completos (los 100 últimos, sin `?day=`) con fechas cortas (`formatShortDate`: «9 oct», el año solo si no es el actual) y un botón fijo en `StickyActionBar`. Crecimiento muestra el último valor de **cada** medida con su fecha y la variación de peso respecto al peso anterior («+350 g en 14 días», `describeWeightChanges`, pura); entrada decimal con `UnitField` (teclado decimal, unidad en el nombre accesible). Salud abre el alta ya en «Vacuna» o «Medicamento» (`?kind=`), repite uno de los 4 últimos medicamentos en un toque (`listRecentMedications`: los 50 últimos registros por índice, sin repetir nombre aunque cambien mayúsculas o espacios, en código) y marca la reacción con icono y la palabra «Reacción». Piezas compartidas: `RecordHistoryItem` (fila de historial de los 5 módulos, con línea `note`), `authorNamesOf` y `dayNavHrefs`. `not-found.tsx` raíz y `global-error.tsx`. | Regla de tres antes de la cuarta y quinta copia; registros espaciados en semanas no necesitan navegación por días; menos teclado y menos carga a una mano (§4.2); `distinct` + `take` de Prisma no garantiza el orden; §3.3 pide los dos límites de error raíz. Plan: `docs/superpowers/plans/2026-10-09-fase3-tarea6-sprint-final.md`. |
| 064 | 2026-10-09 | Ajustes: `removeHouseholdMember` (solo el OWNER, nunca a sí mismo, filtrado además por `role: MEMBER`) borra al miembro y **revoca las invitaciones pendientes** en una transacción con el bloqueo `SELECT … FOR UPDATE` de la familia, el mismo del canje (ADR-043); `revokeHouseholdInvite` («Anular código») con el mismo bloqueo, para cualquier miembro. Un id ajeno o ya expulsado recibe `ok` (idempotente, no revela nada); un MEMBER recibe `CONFLICT`. Los registros del expulsado se conservan sin nombre. Tema Sistema · Claro · Oscuro con `next-themes`, pintado tras la hidratación. Sin sección «Cuenta»: cerrar sesión sigue en Más. | Respuesta a un código filtrado sin carreras con un canje simultáneo; el contrato de §3.3 no tiene `FORBIDDEN`; las barreras se probaron con pruebas de mutación y pasaron la revisión de seguridad. |
| 065 | 2026-10-09 | Dashboard «Hoy»: una sola tanda de lecturas en paralelo (`getDailySummary`, última toma, último pecho, cronómetros activos, último peso y miembros). Cronómetros en curso como tarjetas que **enlazan** a su módulo, donde vive «Parar» (D2); en días pasados (`?day=`), solo el resumen, y cada tarjeta abre ese día en su historial (D4). Tiempo relativo con `TimeAgo` (se repinta cada 30 s); `useServerClock` corrige el desfase del reloj del dispositivo para `TimeAgo` y `ElapsedTime`, con el primer pintado a la hora del servidor. Los textos del resumen viven en `features/dashboard/labels.ts` (sobre `DailySummary`) y la descripción de la última toma en `features/feeding/labels.ts`: cada módulo describe lo suyo (§2.9). | La pregunta de la noche («¿cuándo comió y qué pecho toca?») en un vistazo y sin duplicar la lógica de las barras; tiempos relativos sin desajuste de hidratación (§2.5); el objetivo de 1,5 s en 4G (criterio de salida) se mide en el bloque C. Plan: `docs/superpowers/plans/2026-10-09-fase4-plan-maestro.md`. |
| 066 | 2026-10-10 | Sincronización por **Broadcast privado por familia**. `private.broadcast_household_change()` (`SECURITY DEFINER`, solo ejecutable por `prisma`, en `supabase-bootstrap.sql` §4) lo disparan *triggers* `AFTER INSERT OR UPDATE OR DELETE FOR EACH ROW` en los 5 registros del bebé y envía `realtime.send({table, op}, 'change', 'household:<id>', private)`, sin la fila (no `broadcast_changes`, que mandaría datos de salud). La política `SELECT` de `realtime.messages` (§5) solo deja entrar a los miembros (`is_household_member` sobre el *topic*) y no hay política `INSERT`. Las tablas salen de `supabase_realtime` con `private.remove_table_from_realtime` (§2b). `RealtimeSync` se une al canal (`setAuth` antes, supabase-js renueva el token), refresca con *debounce* de 300 ms, vuelve a unirse al volver a primer plano o a la red y, al reunirse, se pone al día; sustituye a `RefreshOnFocus`. El cargador lee `requireMember()` dentro de `Suspense`, así que el layout sigue estático. Indicador de conexión (D3) como píldora fija arriba, con una región `role="status"` siempre presente. | Datos de salud de un menor (§5): los `DELETE` de `postgres_changes` llegaban a todas las cuentas sin filtro ni RLS. Probado en el spike S0 y verificado vía MCP en dev (los *triggers*, la política, una escritura real que genera una señal privada y ningún aviso nuevo de los *advisors*). `realtime.send` silencia sus errores y necesita las particiones que crea Realtime cuando se conecta un cliente: se comprueban al migrar (regla 0.2) y al desplegar. Sustituye el transporte de la 015 y cumple la evolución que preveía la regla 2.8. |
| 067 | 2026-10-10 | `useServerClock` mide el desfase del reloj **una vez por render** (`createSkewRegistry`) y, si el render ya tiene minutos al verse por primera vez, se fía del reloj del dispositivo; repinta al instante cuando vuelve a mostrarse. `TimeAgo` se repinta cada 10 s. Selector de fecha con `<input type="date">` nativo sobre la etiqueta de `DayNav` (`dayNavProps`, `dayHref`), en lugar de `Popover` + `Calendar`. | Con Cache Components, Next oculta las pantallas visitadas con `<Activity>`: al volver, los efectos se ejecutan con el `serverNow` antiguo y medir de nuevo congelaba «Hace…» (y los cronómetros) en la hora de aquel render. El selector nativo (calendario del sistema) es accesible, se usa con una mano y no añade `react-day-picker` (regla 0.7). |
| 068 | 2026-10-10 | El proyecto Supabase `baby-tracker` (eu-west-3) pasa a ser el entorno de **producción** (sustituye a la 026; la 018 queda en suspenso). Mientras sea el único proyecto: (1) toda escritura vía MCP es sobre producción y necesita confirmación explícita del usuario (regla 0.2); (2) el seed no se vuelve a ejecutar; (3) no se usa `prisma migrate dev` contra él: el siguiente cambio de esquema empieza por crear un proyecto dev nuevo (o una rama de Supabase) con `supabase-bootstrap.sql`, y aquí solo se aplica `prisma migrate deploy`, verificado vía MCP; (4) los tests de integración siguen en `baby_tracker_test`, una base de datos aparte de la misma instancia, protegida por la guarda de las decisiones 037 y 038; (5) Vercel usa las variables de producción, que introduce el usuario (los secretos nunca pasan por Claude). | Los dos móviles ya trabajan sobre este proyecto con datos reales: crear otro y trasladar los datos no aporta nada al MVP. Se asume compartir instancia con la base de pruebas, acotado por esa guarda, a cambio de no poder probar migraciones fuera de producción hasta crear el nuevo proyecto dev. |
| 069 | 2026-10-10 | Se pide el **sexo del bebé**, opcional (sustituye esa parte de la 046): «Niña · Niño · Prefiero no decirlo» con `ChoiceGrid` (`BabySexField`); «Prefiero no decirlo» se guarda como `null` en la columna `sex` existente, sin migración ni tercer valor en el enum. El resto de textos de la app sigue sin género (decisión 062). | Las futuras gráficas de percentiles de la OMS se dibujan por sexo: es un propósito concreto que justifica el dato (minimización, RGPD), y sigue siendo opcional. |
| 070 | 2026-10-10 | `requireBaby()` **lanza un error** (`Household <id> has no baby`) si la familia no tiene bebé, en lugar de redirigir a `/join`. Lo pinta el `error.tsx` del segmento, con la barra inferior como salida, y queda en el log del servidor. *(Rama del 2026-10-09, decisión 056 renumerada al integrarla.)* | Desde la decisión 044 la familia y su bebé se crean en un solo insert: una familia sin bebé es un dato corrupto, no un paso del onboarding. Redirigir lo ocultaba (`/join` → `/`, dos saltos) y, con el dashboard de `/` usando `requireBaby()`, cualquier redirección hacia `/` sería un bucle infinito. |
| 071 | 2026-10-10 | Crear la familia en un **asistente de dos pasos** («Tú» y «Tu bebé») con **un solo envío** al final: sigue siendo un único insert (decisión 044), así que nunca existe una familia sin bebé y no hace falta bloquear rutas. El paso vive en la URL (`/join/create?step=baby`) mediante `window.history.pushState`, que Next sincroniza con `useSearchParams` sin ir al servidor: el botón atrás del sistema vuelve al paso 1 conservando lo escrito, la flecha de la cabecera hace `history.back()` (`PageHeader.onBack`) y recargar en el paso 2 vuelve a empezar. El foco salta al primer campo del paso y una región `role="status"` anuncia «Paso N de 2». **Primer uso:** sin ningún registro (`hasAnyRecord`, cinco búsquedas de un id en paralelo), «Hoy» muestra «Todo listo para …» con «Primer pañal / Primera toma / Primera siesta» y oculta el resumen a cero. **Editar el bebé:** `updateBaby` (los dos miembros, *last write wins*, acotado a la familia en la misma sentencia; «Prefiero no decirlo» borra el sexo) en `/settings/baby` con los mismos `BabyFields` del onboarding, y la tarjeta «Tu bebé» con `formatBabyAge`. **Salir y eliminar:** `leaveHousehold` solo para el MEMBER (el OWNER recibe `CONFLICT`: no hay transferencia de la familia); `deleteHousehold` solo para el OWNER, que teclea el nombre del bebé (`matchesBabyName`, isomórfico: sin mayúsculas ni espacios sobrantes, con tildes) y el servidor lo vuelve a comprobar; ambas bajo el bloqueo de la familia del canje (ADR-043) y redirigen a `/join`; eliminar borra en cascada miembros, invitaciones, bebés y registros. **Excepción acotada a la regla 4.3:** el `AlertDialog` de eliminar lleva ese único campo. | Más profesional y nativo sin estados intermedios en la base de datos, con el botón atrás de Android funcionando como se espera (regla 4.3); un primer día acogedor en lugar de ceros; el derecho de supresión del RGPD sin pasos manuales, con barreras probadas con pruebas de mutación. Sin migraciones (decisión 068): el bebé no tiene `updatedById`, así que no se muestra quién lo editó, y el otro móvil no recibe señal al eliminarse la familia (va a `/join` en su siguiente acción). Plan: `docs/superpowers/plans/2026-10-10-onboarding-y-familia.md`. |
| 072 | 2026-10-12 | **PWA sin dependencias nuevas.** `app/manifest.ts` (`id: "/"`, `standalone`, colores literales del tema claro) e iconos **provisionales** generados con `next/og` (`app/icon.tsx` con `generateImageMetadata`: 192, 512 y *maskable*; `app/apple-icon.tsx`). *Service worker* manual en `public/sw.js`, registrado solo en producción (`ServiceWorkerRegistration`, `updateViaCache: "none"`) y servido con `no-store` y CSP propia: las navegaciones, el RSC y las Server Actions van **siempre** a la red; si una navegación falla, muestra `/offline` (estática, sin sesión). Solo guarda, al instalarse, `/offline`, los recursos que su HTML referencia y los iconos; sin caché en tiempo de ejecución. Subir `VERSION` para renovarla. El *matcher* de `proxy.ts` excluye, con anclas, el manifiesto, el SW, los iconos y `/offline`. Metadatos de iOS: `appleWebApp` (`statusBarStyle: "default"`) y `formatDetection`. En iPhone y iPad, abierta en el navegador, «Hoy» muestra cómo instalarla (Compartir › Añadir a pantalla de inicio) y avisa de que habrá que volver a entrar; «Ocultar» se recuerda en `localStorage` si está disponible. «Reintentar» de `/offline` es un `<a>` (única excepción de `no-html-link-for-pages`). | Serwist sería una dependencia nueva para un SW de 60 líneas (regla 0.7). Nunca se guardan datos de la familia (§5): sin red, la app no tiene nada que enseñar salvo ese aviso, y Next deja en espera las navegaciones del cliente hasta que vuelve la red. Cachear cada archivo del build crecería con cada despliegue sin aportar nada (Vercel ya los sirve como inmutables). Una redirección a `/login` rompería la instalación, pero un prefijo sin ancla dejaría sin refresco de sesión a rutas futuras. iOS no tiene aviso de instalación propio y Safari no comparte la sesión con la app instalada. Un `<Link>` sin red parecería no hacer nada. |

---

*Si este documento queda desactualizado respecto al código, se actualiza el documento en el mismo cambio. Ante la duda entre este archivo y un hábito por defecto, manda este archivo.*
