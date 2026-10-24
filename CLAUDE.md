# CLAUDE.md — Directrices de desarrollo de Nidly

> **Instrucción permanente para Claude:** lee este archivo **completo** al inicio de cada sesión y **antes de proponer cualquier solución**, diseño o cambio de código. Estas reglas tienen prioridad sobre tus hábitos por defecto. Si una petición contradice alguna regla, dilo explícitamente y propón una alternativa antes de actuar; no rompas una regla en silencio.

> **Nidly** (nombre definitivo desde el 2026-10-24, decisión 087; sustituye al nombre en clave «Kidoo») es la evolución del MVP «Métricas Bebé» hacia un SaaS B2C multi-tenant. El MVP está **en producción**; la evolución se planifica en [`PLAN_ESCALABILIDAD_NIDLY.md`](./PLAN_ESCALABILIDAD_NIDLY.md) por fases **K0–K9**.
>
> **Vigencia de las reglas:** las reglas sin marca están **vigentes hoy**. Las marcadas **[Kx]** entran en vigor cuando la fase Kx esté aprobada y su primera tarea fusionada; hasta entonces manda el comportamiento actual. Las decisiones 073–089 están **aprobadas** desde el 2026-10-24; la fase en curso es **K0**.

---

## 0. Protocolo de trabajo (obligatorio en cada interacción)

1. **Leer contexto:** este archivo completo, el estado de `README.md` y la fase en curso de [`PLAN_ESCALABILIDAD_NIDLY.md`](./PLAN_ESCALABILIDAD_NIDLY.md) (qué está hecho y qué falta). Ante una duda de arquitectura, consultar el [registro de decisiones](./docs/architecture/decisions.md).
2. **Ubicar la petición** en el plan (fase K y tarea). Si no encaja, avisar: ¿es alcance nuevo?, ¿va a una fase posterior?, ¿adelanta algo que depende de una fase sin terminar?
3. **Planificar antes de codificar** cuando el cambio no sea trivial: qué archivos se crean o modifican y qué decisiones implica. Pedir confirmación antes de cambios grandes o difíciles de revertir: esquema de BD, dependencias nuevas, estructura de carpetas, entornos, cambios en estas reglas. Cada fase K tiene su plan detallado en `docs/superpowers/plans/` antes de escribir código.
4. **Verificar APIs contra las versiones instaladas** (`package.json`), no contra la memoria. Next.js 16, React 19, Prisma 7, Zod 4, Tailwind CSS 4, `@supabase/ssr` y, cuando se instalen, `next-intl` y el Vercel AI SDK cambiaron APIs importantes respecto a versiones anteriores. Ante la duda, consultar la documentación oficial.
5. **Cerrar el trabajo:** ejecutar `npm run typecheck`, `npm run lint` y los tests relevantes; marcar las casillas del plan y de los README (`README.md` en inglés y `README.es.md` en español, siempre sincronizados en el mismo cambio, decisión 085); añadir al [registro de decisiones](./docs/architecture/decisions.md) cualquier decisión nueva.
6. **Idioma:** conversar con el usuario en español. Código, identificadores, BD, rutas, commits y comentarios técnicos en inglés. Documentación interna (`CLAUDE.md`, plan, decisiones, planes de fase) en español; el README público en inglés con su versión `README.es.md` (decisión 085). Textos visibles de la UI en español hoy; desde **[K1]**, en catálogos de mensajes por idioma (§2.10), nunca escritos dentro de los componentes.
7. **Dependencias:** no añadir ninguna sin justificar qué problema resuelve y por qué no basta con lo que ya hay. Las previstas para Nidly están en el plan (§12); aun así, cada una se confirma al instalarla.
8. **Skills primero:** en cada paso, evaluar y ejecutar las skills disponibles antes de escribir una solución propia (ver [0.1](#01-regla-de-alta-prioridad-uso-proactivo-de-skills)).
9. **MCP para la base de datos:** inspeccionar, verificar migraciones y depurar datos con el MCP de Supabase/PostgreSQL, sin pedir al usuario que ejecute SQL (ver [0.2](#02-regla-de-alta-prioridad-uso-de-mcp-para-la-base-de-datos)).
10. **Git y entornos:** ver [0.3](#03-git-entornos-y-despliegue).

### 0.1 Regla de alta prioridad: uso proactivo de skills

> **REGLA ESTRICTA.** El entorno cuenta con un amplio catálogo de custom skills configuradas (especialmente para diseño UI/UX, generación de componentes, linters, etc.). Tienes la obligación **ESTRICTA** de evaluar y ejecutar estas skills de forma proactiva en cada paso para garantizar una implementación perfecta de grado Senior, antes de intentar escribir soluciones genéricas desde cero.

**Cómo se aplica:**

- Antes de cada paso (planificar, diseñar una pantalla, crear un componente, escribir tests, revisar o depurar), revisar la lista de skills disponibles en la sesión y ejecutar las que encajen **antes** de escribir código propio.
- Orientación por tipo de tarea (los nombres pueden variar según el entorno; manda la lista real de la sesión):

| Tarea | Skills a evaluar |
|---|---|
| Decisiones de arquitectura, nuevas dependencias, modelo de datos | `engineering:architecture`, `engineering:system-design` |
| Supabase: RLS, Auth, Realtime, Storage, pgvector, conexiones | `supabase`, `supabase-postgres-best-practices` + `search_docs` del MCP de Supabase |
| SQL, migraciones, índices, políticas | `supabase-postgres-best-practices` |
| Diseño de pantallas y componentes UI | `frontend-design`, `design:design-system` |
| Textos de interfaz (botones, errores, estados vacíos) y traducciones | `design:ux-copy` |
| Accesibilidad | `design:accessibility-review` |
| Estrategia y escritura de tests | `engineering:testing-strategy`, `superpowers:test-driven-development` |
| Planes de fase | `superpowers:writing-plans` |
| Revisión antes de cerrar una tarea | `engineering:code-review`, `security-review` en cambios de autorización, RLS o IA |
| Depuración de errores | `engineering:debug`, `superpowers:systematic-debugging` |
| Despliegues y CI/CD | `engineering:deploy-checklist` |
| Producto e investigación | `product-management:*` |
| Linters, formateo u otras herramientas configuradas como skill | la skill correspondiente, antes de configurarlas a mano |

- Las skills complementan este archivo, no lo sustituyen: si el resultado de una skill choca con una regla de `CLAUDE.md` (p. ej. propone un formulario dentro de un modal), manda `CLAUDE.md` y se adapta el resultado.
- Al cerrar cada tarea, indicar qué skills se han usado; si ninguna aplicaba, decirlo explícitamente.

### 0.2 Regla de alta prioridad: uso de MCP para la base de datos

> **REGLA ESTRICTA.** Cuando haya un servidor MCP de PostgreSQL/Supabase activo en la sesión, es **obligatorio** usarlo para inspeccionar el estado de la base de datos, validar que las migraciones de Prisma se han aplicado correctamente y depurar datos de prueba. **No se pide al usuario que ejecute comandos SQL manualmente.**

**Cuándo es obligatorio:**

- **Tras cada `prisma migrate dev` o `prisma migrate deploy`**, verificar (desde **[K0]** además con `scripts/verify-db.ts` en CI):
  - la tabla `public._prisma_migrations`: la migración figura con `finished_at` no nulo y `rolled_back_at` nulo, y coincide con las carpetas de `prisma/migrations/`;
  - que existen las tablas, columnas, enums e índices esperados, incluidos los índices únicos parciales;
  - que RLS está activado en todas las tablas de la app (`pg_tables.rowsecurity`) y que las políticas son las previstas (`pg_policies`); desde **[K2]**, las cuatro políticas `tenant_*` por tabla y `app_tenant` sin `BYPASSRLS`;
  - que cada tabla de registros del bebé (y, desde **[K3]**, `household_messages`) tiene el *trigger* `broadcast_household_change`, que ninguna tabla de la app está en la publicación `supabase_realtime` (`pg_publication_tables`) y que `realtime.messages` tiene particiones para hoy (sin ellas, `realtime.send` pierde las señales sin dar error; decisión 066).
- **Tras cambios de esquema o de seguridad:** revisar los *advisors* de seguridad y rendimiento del proyecto (`get_advisors`) y resolver los avisos antes de dar la tarea por cerrada.
- **Al depurar:** consultar los datos implicados con `SELECT` acotados y los logs del proyecto, antes de proponer cambios.
- **Al preparar datos de prueba:** solo en **staging** o en la BD efímera de CI (desde **[K0]**; hasta entonces no hay entorno de pruebas: decisión 068).

**Límites no negociables:**

- **Solo lectura por defecto.** Las escrituras vía MCP solo se permiten en staging/desarrollo y para datos de prueba. Nunca sobre producción sin confirmación explícita del usuario.
- **El esquema lo gestiona exclusivamente Prisma Migrate.**
  - No usar `apply_migration` ni DDL con `execute_sql` para cambiar el esquema: genera *drift* respecto a `prisma/migrations/`.
  - El SQL adicional (RLS, políticas, índices parciales, *grants*, *triggers*) va dentro de una migración de Prisma (`prisma migrate dev --create-only` y editar el `migration.sql`). Lo que exige privilegios de `postgres` (roles, extensiones, `realtime.send`, buckets de Storage) va a `prisma/platform/supabase-bootstrap.sql` y a `shadow-stubs.sql` (decisión 027).
- `list_migrations` del MCP de Supabase muestra las migraciones de la CLI de Supabase, **no** las de Prisma. La referencia de Prisma es `public._prisma_migrations`.
- **Prohibido sin confirmación explícita:**
  - `DROP`, `TRUNCATE`, y `DELETE` / `UPDATE` sin `WHERE`;
  - `prisma migrate reset`;
  - pausar o restaurar proyectos, crear proyectos con coste, y fusionar, reiniciar o borrar ramas.
- Identificar siempre el proyecto (`project_id`) y confirmar si es **staging** o **prod** antes de ejecutar cualquier consulta.
- Minimizar datos personales en el chat: columnas concretas y `LIMIT`; nunca volcados completos de tablas con datos reales.
- **Si no hay MCP activo:**
  1. Decirlo.
  2. Usar lo que Claude pueda ejecutar por sí mismo (`npx prisma migrate status`, `scripts/verify-db.ts`).
  3. Solo en último caso, pedir ayuda al usuario explicando por qué.

### 0.3 Git, entornos y despliegue

- **Hoy:** `main` despliega producción en Vercel. Nunca se trabaja en `main` directamente: cada tarea va en una rama corta (`feat/…`, `fix/…`, `docs/…`, `chore/…`, `db/…`).
- **Sin push ni PR** salvo que el usuario lo pida. Commits atómicos en Conventional Commits en inglés, firmados solo por el usuario.
- **[K0]** `main` protegida: solo PR con CI en verde, *rebase and merge*, una migración por PR (decisión 074).
- **[K0]** Entornos (decisión 075): `production` (proyecto actual), `staging` (proyecto nuevo en la UE, *Previews* de Vercel, desarrollo local) y `ci` (Postgres efímero). Los tests nunca tocan la instancia de producción.
- **[K0]** Migraciones y lanzamientos (decisiones 076 y 088): Vercel ya no despliega `main` solo. El *workflow* manual `release` migra staging, pide aprobación, migra producción, pasa `verify-db` y solo entonces despliega la app. Siempre **expand → migrate → contract**: toda migración es compatible con el código anterior y con el siguiente.
- **Trabajo de Nidly no publicado:** detrás de *feature flags* (§2.12), nunca en ramas de larga vida.

---

## 1. Contexto

- **Producto:** **Nidly**, SaaS B2C mobile-first (PWA instalable) para registrar y entender el día a día de un bebé: tomas, pañales, sueño, crecimiento y salud, con dashboard diario. Lo usan varias familias, cada una con sus cuidadores, sus bebés y sus datos aislados. Evolución en curso: multi-tenant estricto, varios idiomas, chat familiar, asistente IA (texto y voz), percentiles OMS, informes para el pediatra y predicción de sueño.
- **Usuarios:** padres, madres y cuidadores (abuelos, canguros), en el móvil, con una mano, a menudo de noche y cansados. **Ven y editan los mismos datos, sincronizados en tiempo real**, según su rol en cada familia.
- **Prioridad absoluta:** velocidad y fiabilidad del registro, y privacidad de los datos de salud de un menor, por encima de la riqueza de funciones.
- **Estado:** el MVP (Fases 1–4, «Métricas Bebé») está en producción desde el 2026-10-10 con familias reales. La interfaz conserva el nombre «Métricas Bebé» hasta **[K1]**.
- **Stack:**
  - Next.js 16 (App Router, Cache Components), React 19, TypeScript estricto
  - Tailwind CSS 4 y shadcn/ui (Base UI)
  - Prisma 7 + `@prisma/adapter-pg` sobre **Supabase PostgreSQL** (UE)
  - Supabase Auth, Realtime (Broadcast privado) y, desde **[K5]**, Storage; `pgvector` desde **[K6]**
  - Zod 4, React Hook Form, date-fns y Vitest
  - **[K1]** `next-intl` · **[K6]** Vercel AI SDK + Gemini en Vertex AI (región UE)
  - Vercel (`cdg1`) y, desde **[K0]**, GitHub Actions

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
- Route Handlers solo cuando sea imprescindible: callback de Auth, exportaciones (CSV, informes PDF **[K5]**), enlaces públicos de informes **[K5]**, *webhooks* de pagos **[K9]**.
- Toda query filtra por un `babyId` o `householdId` **ya autorizado** y, en listados, usa `select` con los campos estrictamente necesarios.
- **[K2]** Toda query de usuario se ejecuta dentro de `withTenant(member, tx => …)`, que aplica RLS a la propia consulta (decisión 078). `systemDb` solo en la lista cerrada de §2.7.
- Las páginas con datos son **dinámicas** (dependen de la sesión). Nunca cachear respuestas con datos entre usuarios ni prerenderizarlas en build. `"use cache"` solo para datos de referencia globales (p. ej. tablas OMS **[K4]**).
- Lecturas independientes en paralelo con `Promise.all`; *streaming* con `<Suspense>` y `loading.tsx`. Listados largos (chat **[K3]**) con paginación por cursor, nunca por `OFFSET`.

### 2.3 Mutaciones: Server Actions

- **Todas** las escrituras pasan por Server Actions en `src/features/<módulo>/actions.ts` (`"use server";` al inicio del archivo). El cliente **nunca** escribe en la base de datos con `supabase-js`. **Tampoco el asistente IA**: el modelo propone y el usuario confirma con la Server Action de siempre (§2.11).
- Cada Server Action es un **endpoint público**: el parámetro de entrada se trata como `unknown`, se comprueba la sesión y la pertenencia a la familia (y, desde **[K2]**, el rol), y se valida **siempre** con Zod en el servidor aunque el cliente ya haya validado.
- Plantilla obligatoria (desde **[K2]**, el acceso a datos va dentro de `withTenant`):

```ts
"use server";

export async function createDiaperChange(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const member = await requireMember(); // sesión + familia activa (+ rol en K2); sin sesión → UNAUTHENTICATED
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
- Las reglas de negocio no triviales (prorrateo de sueño entre días, cálculo del resumen, sugerencia de pecho, percentiles **[K4]**, predicción de sueño **[K8]**, permisos por rol **[K2]**, derechos por plan **[K9]**) van en `features/<módulo>/service.ts` (o en un archivo puro con nombre propio) como funciones puras y testeables. La action solo orquesta: autorizar → validar → servicio/Prisma → revalidar → responder.
- Operaciones que tocan varias filas (p. ej. parar una toma y empezar otra) van en `db.$transaction` (desde **[K2]**, la transacción de `withTenant`).
- **[K6]** Las acciones que consumen cuota (IA) la comprueban y la descuentan de forma atómica **antes** de llamar al proveedor.

### 2.4 Client Components y formularios

- **Formularios:** React Hook Form + `zodResolver(schema)` con el **mismo schema** que usa la action. El submit llama a la action dentro de `startTransition`; los `fieldErrors` del `ActionResult` se trasladan con `form.setError`.
- **Acciones de un toque** (pañal mojado, iniciar cronómetro, enviar mensaje **[K3]**): botón que genera el UUID (`crypto.randomUUID()`) e invoca la action con `useTransition`, y `useOptimistic` cuando mejore la sensación de inmediatez.
- **Cronómetros:** la fuente de verdad es `startedAt` en la BD (`endedAt = null` mientras está activo). El cliente solo pinta `now − startedAt` con un intervalo de 1 s. Nunca guardar el estado de un cronómetro solo en el cliente: debe sobrevivir al bloqueo del móvil, al cierre de la pestaña y, sobre todo, **verse y poder pararse desde el dispositivo de otro cuidador**.
- **Estado:** sin librerías de estado global. Filtros (p. ej. el día seleccionado) en `searchParams`; estado de UI en local. La familia activa **[K2]** vive en una cookie validada por el servidor, nunca en estado del cliente.
- **Llamadas a actions desde el cliente:** siempre `await callAction(() => action(input))` (`lib/call-action.ts`), nunca `await action(input)` directo: si la red cae, la llamada se rechaza y `error.tsx` sustituiría la pantalla; `callAction` lo convierte en un `ActionResult` `UNEXPECTED` («No hay conexión…») y vuelve a lanzar los `redirect()`. Tras un `UNEXPECTED` no se llama a `router.refresh()` (decisión 089).
- **Feedback:** todo botón que dispara una action muestra estado pendiente y se deshabilita mientras tanto. Éxito → toast (`sonner`); error → mensaje junto al campo o toast; `UNAUTHENTICATED` → redirigir al login.

### 2.5 Fechas y zona horaria

- La BD guarda las fechas como `timestamptz` en **UTC**.
- "Hoy", "ayer" y los resúmenes diarios son el **día natural en la zona horaria del hogar**, calculado en el servidor con `@date-fns/tz`. Hoy la zona es global (`APP_TIMEZONE`, por defecto `Europe/Madrid`); desde **[K2]** es `households.time_zone` (decisión 077) y `APP_TIMEZONE` solo es el valor por defecto de las familias nuevas. **Prohibido** depender de la zona horaria implícita del servidor (p. ej. `new Date().setHours(0, 0, 0, 0)`; en Vercel el servidor está en UTC).
- Los valores de `<input type="datetime-local">` no llevan zona: el servidor los interpreta en la zona del hogar (transformación en el schema Zod, decisión 049).
- Sesiones que cruzan la medianoche se reparten entre los días según el tramo que cae en cada uno.
- Todo el formato pasa por `src/lib/dates.ts`. Hoy: locale `es`, 24 h ("14:30", "hace 25 min", "1 h 20 min"). Desde **[K1]**, el *locale* de date-fns del idioma activo y su formato horario. Los tiempos relativos que cambian solos ("hace 5 min") se pintan en un Client Component que se actualiza, para evitar desajustes de hidratación.
- Las horas relativas que dice el usuario o el asistente IA ("hace 10 min") las resuelve **el servidor** con su reloj (decisión 062), nunca el cliente ni el modelo.

### 2.6 Base de datos (Prisma 7 + Supabase PostgreSQL)

**Dos URLs de conexión obligatorias (estándar Supabase), por entorno:**

| Variable | Conexión de Supabase | Puerto | La usa |
|---|---|---|---|
| `DATABASE_URL` | Supavisor en **modo transacción** + `?pgbouncer=true` | 6543 | La app en tiempo de ejecución: `PrismaPg` en `src/lib/db.ts` |
| `DIRECT_URL` | **Session pooler** (redes IPv4) o conexión directa (IPv6) | 5432 | La CLI de Prisma (`migrate`, `studio`) vía `prisma.config.ts` |

- **Particularidad de Prisma 7:** las URLs ya **no** van en `schema.prisma` (el `datasource` solo declara `provider = "postgresql"`) y `directUrl` ha desaparecido. Las dos variables se reparten así:
  - `prisma.config.ts` → `datasource: { url: env("DIRECT_URL") }`, para la CLI y las migraciones;
  - `src/lib/db.ts` → `new PrismaClient({ adapter: new PrismaPg({ connectionString: env.DATABASE_URL }) })`, para la app.
- Nunca usar `DIRECT_URL` en la app ni migrar a través del puerto 6543.
- Conectar con un **rol dedicado `prisma`** (guía oficial de Supabase), no con `postgres`. **[K2]** Las peticiones de usuario adoptan el rol `app_tenant` (sin `BYPASSRLS`) dentro de `withTenant` (decisión 078).
- **Pool pequeño por instancia** (las funciones de Vercel escalan en horizontal): se dimensiona con `pg_stat_activity` y el límite de clientes del pooler. Sin sentencias preparadas con nombre (modo transacción).
- Prisma **7.x estable** (el tag `latest` de npm apunta a una RC de Prisma 8: no usarla). Generator `prisma-client` con `output` a `src/generated/prisma`. Cliente y tipos se importan **desde el output generado** (p. ej. `@/generated/prisma/client`), nunca desde `@prisma/client`. La carpeta generada no se edita y está en `.gitignore`.
- Singleton en `src/lib/db.ts` (`import "server-only"`, caché en `globalThis` en desarrollo para evitar múltiples instancias con el *hot reload*).
- **Solo** `features/*/queries.ts`, `features/*/actions.ts`, `features/*/service.ts`, `prisma/seed.ts` y los scripts de `scripts/` importan `db`. Los componentes nunca. **[K2]** `systemDb` solo en los archivos de la lista cerrada (regla de ESLint).

**Migraciones:**

- `prisma migrate dev --name <descripcion_snake_case>` **solo contra desarrollo o staging**; en producción, `prisma migrate deploy` (desde **[K0]**, solo desde CI con aprobación).
- Nunca `db push` ni editar migraciones ya aplicadas.
- El SQL que Prisma no modela (RLS, políticas, índices parciales, *grants*, *triggers*) se añade en la **misma migración** con `--create-only`.
- **Expand → migrate → contract** (decisión 076): añadir antes que exigir; borrar en una PR posterior.
- Tras aplicar, verificar vía MCP (regla 0.2).
- Todo cambio de esquema se propone primero explicando su impacto. Borradores de las migraciones de Nidly: plan §11.

**Convenciones de esquema:**

- `id String @id @default(uuid()) @db.Uuid`, que acepta UUID generados en el cliente.
- `createdAt` / `updatedAt` en todos los modelos, como `@db.Timestamptz(3)`; las demás fechas también como `timestamptz`.
- Modelos PascalCase singular mapeados a tablas snake_case plural (`@@map("sleep_sessions")`) y campos camelCase mapeados a columnas snake_case (`@map("baby_id")`). Así el SQL de RLS y los filtros de Realtime quedan legibles.
- Registros del bebé con `babyId` (`onDelete: Cascade`), `createdById` / `updatedById` (usuario de Supabase Auth) e índice `@@index([babyId, <campoFecha>])`. Tablas de familia que no son del bebé (chat, consentimientos, uso, suscripciones) con `householdId` (`onDelete: Cascade`).
- Medidas como **enteros con la unidad en el nombre**: `amountMl`, `weightGrams`, `lengthMm`, `headCircumferenceMm`. Excepciones: `doseAmount` (`Float`, admite 2,5 ml) y los parámetros L, M, S de referencia OMS **[K4]**. Las unidades imperiales **[K1]** solo existen en la presentación.
- Enums nativos de PostgreSQL vía Prisma; Zod los valida igualmente en la entrada.
- Vectores **[K6]**: `Unsupported("vector(768)")` en Prisma y consultas con TypedSQL.

**Invariantes de concurrencia en la BD, no solo en el código:**

- Una sola toma de pecho activa y una sola siesta activa por bebé: índice único parcial (`... (baby_id) WHERE ended_at IS NULL`). Si la versión de Prisma no lo modela, va en SQL dentro de la migración.
- La violación (`P2002`) se traduce a `CONFLICT` con un mensaje útil ("Ya hay una siesta en curso, iniciada por Ana").
- Las paradas de cronómetro son idempotentes: `updateMany({ where: { id, endedAt: null } })`. Si no actualiza nada, otro dispositivo ya la paró: se devuelve el estado actual, no un error.
- Ediciones: *last write wins*, mostrando quién editó por última vez.
- Contadores (cuotas de IA **[K6]**) con `UPDATE … RETURNING` o bloqueo de fila, nunca leer y luego escribir.

**Otros:**

- Borrado físico salvo en el chat **[K3]** (borrado lógico para no romper el hilo). "Deshacer" solo aplica a creaciones recientes (borra el registro recién creado).
- Entornos de Supabase: hoy solo **producción** (proyecto `baby-tracker`, decisión 068). El seed nunca se ejecuta contra producción. **[K0]** `staging` y BD efímera de CI (decisión 075).

### 2.7 Autenticación y autorización (Supabase Auth)

- Supabase Auth con `@supabase/ssr`: clientes en `src/lib/supabase/server.ts` y `src/lib/supabase/client.ts`; refresco de sesión en `src/proxy.ts` (nombre de `middleware.ts` en Next.js 16).
- Método de acceso: **email + código OTP de 8 dígitos** (la longitud configurada en Supabase Auth; `OTP_LENGTH` en `features/auth/schemas.ts` debe coincidir). No se usan enlaces mágicos porque en iOS abren Safari y no la PWA instalada, y la sesión quedaría fuera de la app. Sesiones de larga duración.
- En el servidor, la identidad se valida con `supabase.auth.getClaims()` (o `getUser()`). **Nunca** confiar en `getSession()` en código de servidor. Nunca usar `user_metadata` para autorizar.
- **Autorización en código, siempre:**
  - `requireMember()` en cada página y action;
  - toda query o mutación comprueba que el `babyId` o `householdId` pertenece al usuario y, desde **[K2]**, que su rol lo permite (`features/household/permissions.ts`, puro y testeado);
  - los recursos de otra familia responden `NOT_FOUND`, sin revelar que existen.
- **RLS activado en todas las tablas de la app:**
  - hoy: políticas `SELECT` para miembros (`is_household_member(...)`), ninguna de escritura, y Prisma con un rol que ignora RLS;
  - **[K2]** RLS también para el servidor (decisión 078): rol `app_tenant` con políticas `SELECT/INSERT/UPDATE/DELETE` por pertenencia y rol; `authenticated` conserva solo `SELECT` para Realtime; `systemDb` (que ignora RLS) solo para la **lista cerrada**: alta de familia, canje de invitación, eliminación de cuenta, *webhooks*, trabajos programados y la distinción de `insertOnce`;
  - la Data API (PostgREST) no expone las tablas de la app.
- Claves: en el cliente solo la **clave publicable** (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`). La clave secreta / `service_role` no se usa; si hiciera falta (eliminación de cuenta en Auth), solo en servidor, en un único módulo y nunca con prefijo `NEXT_PUBLIC_`. Lo mismo para las credenciales de Vertex AI **[K6]** y del proveedor de pagos **[K9]**.
- **Familias:**
  - hoy: el primer usuario crea la familia (`OWNER`) y genera un código de invitación de un solo uso y con caducidad; el otro progenitor se une con ese código (`MEMBER`); un usuario pertenece a una sola familia y hay 2 miembros como máximo;
  - **[K2]** un usuario puede pertenecer a varias familias (decisión 077); roles `OWNER · MEMBER · CAREGIVER · VIEWER`; la invitación fija el rol; familia activa en una cookie que `requireMember()` valida contra la pertenencia en cada petición; el máximo de miembros depende del plan **[K9]**.

### 2.8 Sincronización multi-dispositivo (Supabase Realtime)

- **Fuente de verdad única:** PostgreSQL, leído por los Server Components. Realtime es **solo una señal de invalidación**.
- Un único Client Component `RealtimeSync` (`features/sync/`) en el layout autenticado:
  - se une, con la sesión del usuario, al canal **privado** de Broadcast `household:<id>` de la familia **activa**;
  - un *trigger* en cada tabla de registros del bebé (y del chat **[K3]**) envía a ese canal solo `{table, op}`, nunca la fila;
  - la política RLS de `realtime.messages` decide quién entra (solo los miembros) y ningún cliente puede enviar.
- Al recibir una señal: *debounce* (~300 ms) y `router.refresh()`. **Prohibido** aplicar el *payload* al estado local o construir réplicas en el cliente. Esto incluye los mensajes del chat **[K3]**: se vuelven a leer del servidor, nunca se pintan desde el socket.
- Al volver a primer plano (`visibilitychange` → `visible`) y al recuperar la red (`online`): `router.refresh()` y comprobar o restablecer la suscripción. Los navegadores móviles cierran los WebSockets en segundo plano.
- Indicador de conexión siempre visible cuando no está "en línea" (reconectando · sin conexión).
- **Sin escritura offline:** sin conexión, los botones de registro (y el chat) se deshabilitan con un mensaje claro. Los UUID generados en el cliente dejan preparada una futura cola offline.
- Una tabla nueva con datos de la familia recibe el *trigger* `broadcast_household_change` en su migración. **No** se publica en `supabase_realtime`: los `DELETE` de `postgres_changes` llegan a cualquier cuenta sin filtro ni RLS (decisión 066).
- Notificaciones push **[K3b]**: el aviso nunca incluye contenido (puede ser un dato de salud): «Mensaje nuevo en Nidly».

### 2.9 Estructura de carpetas y dependencias entre capas

```
src/
├── proxy.ts          # Refresco de sesión de Supabase
├── app/              # Routing y composición. Sin lógica de negocio ni acceso a datos directo.
│   ├── (auth)/       # login, join
│   ├── (app)/        # Pantallas autenticadas (RealtimeSync)
│   │   ├── (tabs)/   # Con BottomNav: Hoy, historiales, Más, chat [K3] y las pantallas que cuelgan de Más
│   │   └── (task)/   # Sin barra: formularios, ediciones, invitación, asistente [K6] (una tarea por pantalla)
│   ├── api/          # Solo Route Handlers imprescindibles: informes [K5], webhooks [K9]
│   └── r/[token]/    # Enlace público de informe [K5]
├── features/<m>/     # schemas.ts · queries.ts · actions.ts · service.ts · labels.ts · components/
│   ├── auth/ · household/ · sync/
│   ├── chat/ [K3] · assistant/ [K6] · reports/ [K5] · billing/ [K9]
├── components/
│   ├── ui/           # shadcn/ui generado. Solo ajustes de estilo globales.
│   ├── layout/       # BottomNav, PageHeader…
│   └── shared/       # Componentes reutilizables entre módulos.
├── i18n/ [K1]        # Configuración de next-intl (request.ts, locales)
├── lib/              # supabase/, db.ts, tenant-db.ts [K2], env.ts, action-result.ts, dates.ts, utils.ts
└── generated/        # Prisma (no editar)
messages/ [K1]        # <locale>/<feature>.json
```

- `app/` → puede importar de `features/`, `components/`, `lib/`.
- `features/<m>/` → puede importar de `components/`, `lib/` y de `features/auth` (para `requireMember()`), **no** de otros módulos. Excepciones: `features/dashboard/` puede leer las queries de los demás módulos; `features/assistant/` **[K6]** expone como herramientas las queries de los demás módulos (solo lectura) y valida con sus esquemas; `features/reports/` **[K5]** lee las queries de los demás módulos.
- `components/` y `lib/` → no importan de `features/`.
- `schemas.ts` y `labels.ts` se usan en cliente: **nunca** importan nada `server-only`.

### 2.10 Internacionalización [K1] (decisión 079)

- `next-intl` **sin prefijo de idioma en las rutas** de la app autenticada. Idioma: `profiles.locale` → cookie → `Accept-Language` → `es`.
- Mensajes en `messages/<locale>/<feature>.json` con claves en inglés y ICU para plurales y variables. Ningún texto visible escrito en un componente, esquema o action: ESLint lo comprueba y un test exige que todas las claves existan en todos los idiomas.
- En Server Components, `getTranslations`; en las islas cliente, `useTranslations` con solo el espacio de nombres que necesitan.
- Los mensajes de error de las actions (`ActionError.message`) y de Zod se traducen en el servidor con el idioma de la petición.
- Fechas con el *locale* de date-fns activo; unidades métricas o imperiales según el perfil, solo en presentación y entrada.
- Textos nuevos: en español primero, revisados con `design:ux-copy`, y traducidos antes de fusionar.

### 2.11 Asistente IA [K6–K7] (decisiones 081 y 082)

- **Proveedor:** Vercel AI SDK con Gemini **en Vertex AI, región UE** fijada en el código y comprobada en CI. Prohibida la Gemini Developer API (AI Studio) y cualquier proveedor sin DPA y residencia UE.
- **Consentimiento:** sin `ai_consents` vigente para la familia, ninguna llamada al modelo. Revocable; al revocarlo, efecto inmediato.
- **Contexto:** herramientas de **solo lectura** que el servidor ata al bebé autorizado y ejecuta con `withTenant`. El modelo nunca elige familia, bebé ni identificadores. `pgvector` solo para el corpus curado (y texto libre de la familia con consentimiento específico).
- **Escritura:** salida estructurada validada con los **mismos esquemas Zod** de las actions → tarjeta de confirmación → la Server Action de siempre. **El modelo nunca escribe.**
- **Minimización:** no se guardan transcripciones ni audio; `ai_interactions` solo guarda metadatos. Nada de nombres de cuidadores ni emails en el contexto.
- **Seguridad:** todo texto de usuario (notas, chat, voz) es entrada no confiable para el modelo; las herramientas no tienen efectos; pruebas adversariales en el conjunto de evaluación.
- **Sin consejo médico ni diagnóstico:** el asistente resume y registra, y deriva al pediatra ante síntomas. Cada respuesta lleva la etiqueta «IA».
- **Cuotas** por familia y plan, comprobadas y descontadas de forma atómica antes de llamar al modelo.
- **Calidad:** conjunto de oro versionado (`features/assistant/evals/`) con umbral de exactitud; se ejecuta antes de cambiar de modelo o de prompt.

### 2.12 *Feature flags* y planes [K0 / K9]

- *Flags* por entorno en `env.ts` (validados con Zod) y por familia en `household_feature_overrides` **[K2]**. Se leen en el servidor; el cliente solo recibe el resultado.
- Toda función de Nidly no publicada se fusiona apagada en producción.
- **[K9]** Derechos por plan con `entitlementsFor(tier)` (puro y testeado) y comprobados en el servidor. La UI solo oculta; quien impide es la action.

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
| *Feature flags* | `FEATURE_<NOMBRE>` | `FEATURE_CHAT` |
| Claves de mensajes **[K1]** | `<feature>.<área>.<clave>` en camelCase | `feeding.actions.saveFeeding` |
| Textos de UI | español hoy; catálogos por idioma desde **[K1]** | "Guardar toma" |

**Glosario de dominio (ES → EN), obligatorio para mantener nombres consistentes:**

| Español | Inglés |
|---|---|
| familia | `Household` |
| miembro de la familia | `HouseholdMember` |
| rol: propietario / miembro / cuidador / solo lectura | `OWNER` / `MEMBER` / `CAREGIVER` / `VIEWER` |
| familia activa | `activeHousehold` |
| invitación | `HouseholdInvite` |
| perfil (idioma, unidades) | `Profile` |
| registrado por / editado por | `createdById` / `updatedById` |
| toma | `Feeding` |
| pecho izq. / der. | `BREAST_LEFT` / `BREAST_RIGHT` |
| biberón | `BOTTLE` |
| leche materna / fórmula | `BREAST_MILK` / `FORMULA` |
| pañal | `DiaperChange` |
| mojado / sucio / mixto | `WET` / `DIRTY` / `MIXED` |
| color / textura de heces | `stoolColor` / `stoolConsistency` |
| sueño / siesta | `SleepSession` |
| ventana de sueño (predicción) | `SleepPrediction` |
| crecimiento | `GrowthMeasurement` |
| longitud | `length` |
| perímetro craneal | `headCircumference` |
| percentil / referencia OMS | `percentile` / `GrowthReference` |
| edad gestacional / edad corregida | `gestationalAgeWeeks` / `correctedAge` |
| vacuna | `VACCINE` |
| medicamento | `MEDICATION` |
| reacción | `reaction` |
| resumen diario | `DailySummary` |
| mensaje del chat | `HouseholdMessage` |
| asistente / consentimiento de IA | `Assistant` / `AiConsent` |
| informe / enlace compartido | `ReportExport` / `ReportShareLink` |
| plan / suscripción / derechos | `PlanTier` / `Subscription` / `entitlements` |

### 3.2 TypeScript estricto

- `tsconfig.json`: `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `forceConsistentCasingInFileNames`.
- **Prohibido:**
  - `any`: usar `unknown` y estrechar;
  - `@ts-ignore`: si es inevitable, `@ts-expect-error` con un comentario del motivo;
  - aserciones no nulas `!`;
  - `as`, salvo `as const` o casos justificados con comentario.
- **Tipos derivados, nunca duplicados:** `z.infer<typeof schema>` para entradas; tipos generados de Prisma para modelos y *payloads* con `select`. La salida estructurada de la IA **[K6]** se tipa con los mismos esquemas.
- `switch` sobre enums siempre exhaustivo, con `assertNever(value)` en `default`.
- Tipo de retorno explícito en funciones exportadas (actions, queries, servicios, utilidades). Excepción: las fábricas de esquemas por zona horaria (decisión 049).
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
  message: string; // apto para mostrar al usuario (en su idioma desde K1)
  fieldErrors?: Record<string, string[]>;
};

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: ActionError };
```

- **Errores esperados** se **devuelven**, no se lanzan: validación, sesión caducada, registro inexistente o de otra familia, conflicto como "ya hay una siesta en curso", rol sin permiso (`NOT_FOUND` si revelaría que existe; `CONFLICT` si es una acción sobre lo propio), cuota agotada **[K6]** y función fuera del plan **[K9]** (`CONFLICT` con mensaje claro). Añadir un código nuevo al contrato es una decisión de arquitectura.
- **Errores inesperados** se capturan en la frontera de la action con `handleActionError(actionName, error)`: `console.error` en el servidor con contexto (nombre de la acción e ids, sin datos de salud ni contenido de IA o chat) y mensaje genérico al cliente. Nunca llegan al cliente mensajes de Prisma o de PostgreSQL, del proveedor de IA ni *stack traces*.
- Errores conocidos de Prisma: `P2025` → `NOT_FOUND`; `P2002` → `CONFLICT`, salvo duplicado de clave primaria en un alta idempotente, que es éxito. Un rechazo de RLS **[K2]** (0 filas afectadas o error de política) se trata como `NOT_FOUND`.
- Errores de renderizado: `error.tsx` por segmento (con botón "Reintentar"), `global-error.tsx` y `not-found.tsx`. En queries de detalle, `notFound()` si el recurso no existe o no pertenece a la familia.
- Prohibidos los `catch` vacíos y los errores silenciados.

### 3.4 Validación con Zod 4

- Un schema por caso de uso en `features/<m>/schemas.ts` (p. ej. `createFeedingSchema`, `updateFeedingSchema`), compartido entre cliente y servidor (y con la IA **[K6]**). Los IDs se validan con `z.uuid()`.
- Mensajes en español usando el parámetro `error` de Zod 4 (no el antiguo `message`); desde **[K1]**, por clave de mensaje traducible. Para convertir errores en `fieldErrors`, `z.flattenError()`.
- Las reglas de dominio viven en el schema (`.refine` / `.superRefine`): `endedAt > startedAt`, sin fechas futuras, `amountMl` obligatorio si `type = BOTTLE`, al menos una medida en crecimiento, rangos plausibles.
- Cuidado con `z.coerce.number()`: convierte la cadena vacía en `0`. En campos numéricos de formulario, preprocesar `""` → `undefined`.
- Variables de entorno validadas con Zod en `src/lib/env.ts` (servidor) y `src/lib/public-env.ts` (públicas). El resto del código importa `env`, nunca `process.env` directamente.

### 3.5 Calidad y estilo

- ESLint (config de Next.js) + Prettier con `prettier-plugin-tailwindcss`.
- Componentes de ~150 líneas como máximo; si crecen, extraer subcomponentes.
- Los comentarios explican el **porqué**, no el qué.
- Sin código muerto ni `console.log` en commits (`console.error` solo en fronteras de error).
- Tests con Vitest para schemas, servicios, utilidades de fechas, autorización y concurrencia, junto al archivo probado: `*.test.ts` (unit, sin red ni base de datos) y `*.int.test.ts` (integración contra Postgres real: hoy `baby_tracker_test`; desde **[K0]**, la BD efímera de CI o `baby_tracker_test` en staging, con las factorías de `src/test/factories.ts`).
- **Pruebas de mutación** de cada barrera de seguridad o concurrencia: romper el código protegido una vez, ver fallar el test y restaurar.
- **[K2]** Suite de aislamiento entre familias (tabla × operación × rol × familia ajena) ejecutada **solo con RLS**.
- Commits con Conventional Commits en inglés: `feat(feeding): add breast timer`, `fix(sleep): split sessions across midnight`.

### 3.6 Definición de "hecho"

- [ ] `npm run typecheck`, `npm run lint` y `npm test` pasan (desde **[K0]**, la CI de la PR en verde).
- [ ] Sin `any`, sin `!`, sin `@ts-ignore`.
- [ ] Toda entrada validada con Zod en el servidor y autorizada con `requireMember()`, la comprobación de familia y, desde **[K2]**, el rol y `withTenant`.
- [ ] Si hubo cambios de esquema: migración aplicada en staging (o dev) y verificada vía MCP y `verify-db` (regla 0.2), con los *advisors* revisados; patrón *expand/contract* respetado.
- [ ] Si afecta a datos compartidos: probado con dos sesiones simultáneas (el cambio aparece en el otro dispositivo y no hay duplicados).
- [ ] Estados de carga, vacío, error y sin conexión diseñados.
- [ ] Probado a 375 px de ancho en modo claro y oscuro (y, desde **[K1]**, en todos los idiomas).
- [ ] Si toca IA: consentimiento, cuota, confirmación humana y conjunto de evaluación en verde.
- [ ] Skills aplicables evaluadas y ejecutadas (regla 0.1), e indicadas en el resumen.
- [ ] Plan de la fase y los dos README (`README.md` y `README.es.md`) actualizados.

---

## 4. Reglas de diseño (UI/UX)

### 4.1 Mobile-first

- Se diseña para **360–390 px** de ancho. Los estilos base son los de móvil; los breakpoints (`sm:`, `md:`) solo añaden, nunca al revés.
- Contenedor principal: `mx-auto w-full max-w-md px-4`. En escritorio la app es una columna móvil centrada.
- Respetar las *safe areas* de iOS (`env(safe-area-inset-bottom)`) en la barra inferior y los botones fijos.
- Sin scroll horizontal. Comprobar siempre a 375 × 667 y 390 × 844, también con los textos más largos de cada idioma **[K1]**.

### 4.2 Ergonomía táctil (una mano, poca luz)

- Objetivo táctil mínimo **48 × 48 px** (`h-12`). Acciones principales `h-14` o mayor y a ancho completo.
- Acciones principales en la mitad inferior de la pantalla (zona del pulgar). En formularios, el botón primario va fijo abajo.
- Navegación inferior fija con 5 destinos: **Hoy · Tomas · Pañales · Sueño · Más** (Crecimiento, Salud, Ajustes). Dónde viven el chat **[K3]** y el asistente **[K6]** se decide en el diseño de su fase, sin pasar de 5 destinos.
- Acciones frecuentes en **≤ 3 toques** desde "Hoy".
- Valores por defecto en todo formulario: hora = ahora, siguiente pecho sugerido, última cantidad de biberón, y atajos de hora ("Ahora", "−5 min", "−15 min", "−30 min").
- Preferir **botones grandes de selección** (`ToggleGroup`, rejilla de opciones) a `<select>` y al teclado. El teclado solo para números (`inputMode="numeric"` / `"decimal"`), notas, chat y asistente; la voz **[K7]** como alternativa al teclado.
- Inputs con tamaño de fuente ≥ 16 px (evita el zoom automático de iOS). El código OTP usa `InputOTP` con `inputMode="numeric"` y `autoComplete="one-time-code"`.
- Ningún gesto oculto como única vía (p. ej. deslizar para borrar): siempre hay un botón visible.

### 4.3 Pantallas simples en lugar de modales

- Cada alta o edición es **una ruta propia** (`/feeding/new`, `/diapers/[id]/edit`) con un botón "Atrás" claro. Así funcionan el botón atrás de Android y del navegador, los enlaces directos y la accesibilidad, con menos estado en el cliente.
- **Prohibido:** formularios dentro de `Dialog` / `Sheet` / `Drawer`, modales anidados y rutas interceptadas o paralelas para simular modales.
- **Permitido:** `AlertDialog` solo para confirmar acciones destructivas (borrar) y toasts para feedback. Como mucho, un campo para **teclear la confirmación** de un borrado irreversible (el nombre del bebé al eliminar la familia; decisión 071): es una confirmación, no un formulario de datos.
- Una tarea por pantalla y un único botón primario por pantalla.
- Tras guardar: volver a la pantalla de origen ("Hoy" o el historial del módulo) con toast de confirmación y opción "Deshacer".

### 4.4 Lenguaje visual

- shadcn/ui como base, personalizado **solo mediante tokens CSS** (`globals.css`, `@theme`). Prohibidos los colores *hardcodeados* (`bg-[#…]`, `text-[#…]`).
- Un token de color por módulo (alimentación, pañales, sueño, crecimiento, salud; y, cuando existan, chat y asistente) para reconocerlos de un vistazo, **siempre acompañado de icono y texto**.
- **Modo oscuro desde el día 1** (uso nocturno): sigue `prefers-color-scheme` con interruptor manual; fondos oscuros sin blancos puros ni brillos intensos.
- Tipografía base de 16 px; cifras clave grandes (`text-3xl` o más) con `tabular-nums` en cronómetros y cantidades.
- No transmitir información solo con color (color de heces: muestra + nombre; percentiles **[K4]**: línea + etiqueta).
- Contraste WCAG AA, foco visible, `aria-label` en botones de solo icono, respeto a `prefers-reduced-motion`. Las gráficas **[K4]** tienen una tabla equivalente para lectores de pantalla.
- Todos los estados diseñados: vacío (con llamada a crear el primer registro), cargando (skeleton), error (con reintento), éxito (toast) y **sin conexión** (aviso discreto y registros deshabilitados).
- Datos compartidos: la autoría se muestra discreta ("por Ana") en historiales y en la última toma. Los cambios llegados por Realtime se integran sin saltos bruscos ni pérdida del scroll.
- Iconos `lucide-react` de al menos 20 px dentro de botones.
- Microcopy cercano y breve, tuteando, sin palabras con género para el bebé (decisión 062). Botones con verbos: "Guardar toma", "Iniciar siesta", "Parar".
- Los componentes de `components/ui/` no se modifican para casos concretos: la composición específica va en `features/<m>/components/`.

### 4.5 Asistente IA y chat [K3 / K6]

- **Asistente:**
  - cada propuesta de registro se muestra como **tarjeta de confirmación** («He entendido: Biberón 120 ml · 14:10») con «Guardar», «Corregir» (abre el formulario normal precargado) y «Descartar»;
  - nada se guarda sin ese toque;
  - lo ambiguo se pregunta con botones, no con texto libre;
  - las respuestas llevan la etiqueta «IA» y, si citan el corpus, la fuente;
  - texto fijo y visible: no sustituye al pediatra.
- **Voz:**
  - un botón grande de grabar, con el tiempo restante visible;
  - el permiso de micrófono se pide al primer uso, con una explicación previa de por qué.
- **Chat:**
  - burbujas con autor y hora, mensajes propios a la derecha;
  - estado pendiente o fallido con «Reintentar» (mismo UUID);
  - «Mensaje eliminado» en el borrado lógico;
  - campo de texto ≥ 16 px y fijo sobre el teclado;
  - sin conexión, el campo se deshabilita con aviso.
- **Consentimiento de IA:** pantalla propia (no modal) con qué datos salen, hacia dónde (Google Cloud, UE), qué no se guarda y cómo revocarlo.

---

## 5. Seguridad y privacidad

- Son **datos de salud de menores alojados en la nube** (RGPD art. 9):
  - proyectos de Supabase y cómputo en **regiones de la UE**;
  - acceso solo para miembros autenticados de cada familia, según su rol (2.7);
  - **terceros solo los aprobados como subencargados** en el registro de decisiones: hoy Supabase y Vercel; Sentry en su región UE **[K0]** (decisión 086: sin datos personales ni de salud, sin *Session Replay*, a través de un *tunnel route* propio); Google Cloud (Vertex AI) **[K6]** y el proveedor de pagos **[K9]** cuando se aprueben, con DPA firmado. Sin analítica de terceros, sin fuentes con rastreo y sin SDKs de publicidad.
- **EIPD** (evaluación de impacto) aprobada antes de **[K6]** y antes del lanzamiento **[K9]**.
- **Consentimientos separados y revocables:** registro y compartir con la familia (alta), IA **[K6]**, notificaciones **[K3b]**.
- **Derechos de los usuarios:** exportar los datos de la familia, eliminar la familia (ya existe, decisión 071) y eliminar la cuenta **[K2/K9]**.
- **Minimización:** sin transcripciones de IA ni audio guardados; avisos push sin contenido; nada de datos de producción en staging ni en CI; logs sin datos de salud.
- Autorización en código en cada query y action + RLS en todas las tablas (aplicada también al servidor desde **[K2]**) + Data API sin exponer las tablas.
- Revisar los *advisors* de seguridad de Supabase tras cada cambio de esquema (regla 0.2) y pasar `security-review` en cada cambio de autorización, RLS, IA, pagos o enlaces públicos.
- Secretos solo en `.env` en local y en las variables de entorno de Vercel y GitHub (por entorno). Nunca en el repositorio. `.env.example` sin valores reales. **Los secretos nunca pasan por Claude**: los introduce el usuario.
- Las credenciales de base de datos (`DATABASE_URL`, `DIRECT_URL`), la clave secreta de Supabase, las credenciales de Vertex AI y las del proveedor de pagos son de servidor: nunca con prefijo `NEXT_PUBLIC_` ni en el bundle del cliente.
- El service worker nunca cachea respuestas con datos del usuario (decisión 072).
- Toda entrada se valida en el servidor: las Server Actions son endpoints públicos. Los enlaces públicos (`/r/<token>` **[K5]**) usan tokens aleatorios de los que solo se guarda el hash, con caducidad, revocación y límite de intentos.
- **Regulación sanitaria:** Nidly registra, resume y compara con referencias estadísticas. No diagnostica ni recomienda tratamientos. Las funciones predictivas y el asistente se revisan con ese criterio antes de publicarse (plan §13.2).
- **Marca y repositorio público:** ni ids de infraestructura, ni hosts de producción, ni datos reales en el repositorio.

---

## 6. Comandos

| Comando | Uso |
|---|---|
| `npm run dev` | Desarrollo |
| `npm run build` / `npm start` | Build y producción |
| `npm run typecheck` | `next typegen` + `tsc --noEmit` (decisión 035) |
| `npm run lint` / `npm run format` / `npm run format:check` | ESLint / Prettier |
| `npm test` | Vitest: unit + integración (`test:unit` / `test:int` por separado) |
| `npm run test:db` | Crear y migrar la BD de tests (hoy `baby_tracker_test` en la instancia de producción, decisión 068; **[K0]** `baby_tracker_test` en staging) |
| `npx prisma migrate dev --name <nombre>` | Nueva migración (**solo dev/staging**; hoy no existe, decisión 068) |
| `npx prisma migrate dev --create-only --name <nombre>` | Crear la migración sin aplicarla, para añadir SQL (RLS, índices parciales…) |
| `npx prisma migrate deploy` | Aplicar migraciones (**[K0]** solo desde CI: staging → producción con aprobación) |
| `npx prisma migrate status` | Estado de las migraciones |
| `npx prisma db seed` | Datos de ejemplo (**solo dev/staging**) |
| `npx prisma studio` | Explorar la BD |
| `node --env-file=.env.staging <comando>` | Cualquier comando contra **staging** (p. ej. `node --env-file=.env.staging node_modules/prisma/build/index.js migrate deploy`, `… --import tsx scripts/verify-db.ts`, `… node_modules/vitest/vitest.mjs run`): `.env.staging` se carga primero y `.env` nunca lo sobrescribe |
| **[K0]** `npx tsx scripts/verify-db.ts` | Comprobaciones de la regla 0.2 contra un entorno |
| **[K4]** `npm run reference:load` | Cargar o actualizar las tablas de referencia OMS |

---

## 7. Registro de decisiones

El registro completo (decisiones vigentes **001–072** y de la evolución a SaaS **073–089**) vive en [`docs/architecture/decisions.md`](./docs/architecture/decisions.md). Se trasladó tal cual el 2026-10-24 para que este archivo siga siendo legible en cada sesión; el código lo cita por número («decisión 066»).

- Añadir una fila por cada decisión de arquitectura nueva o modificada. **No borrar filas:** si una decisión cambia, se marca como sustituida y se añade otra.
- Las decisiones en estado «Propuesta» no se aplican hasta que el usuario las apruebe; al aprobarlas, cambiar su estado y fecha.
- Leer las decisiones relacionadas antes de tocar un área (p. ej. 049–053 antes de cambiar esquemas o fechas; 066 antes de tocar Realtime; 078 antes de tocar acceso a datos).

---

*Si este documento queda desactualizado respecto al código, se actualiza el documento en el mismo cambio. Ante la duda entre este archivo y un hábito por defecto, manda este archivo.*
