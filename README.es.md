# Kidoo

🇬🇧 [Read in English](./README.md) · 🇪🇸 **Español**

> **SaaS B2C mobile-first** (PWA instalable) para que las familias registren en segundos el día a día de su bebé (tomas, pañales, sueño, crecimiento y salud) y lo **compartan en tiempo real** entre todos sus cuidadores, con datos protegidos en la UE.
>
> **Estado (2026-10-24):** el MVP, **«Métricas Bebé»**, está en producción desde el 2026-10-10 y lo usa una familia real en iOS y Android. **Kidoo** es su evolución a SaaS multi-tenant y está **en marcha**: ver [`PLAN_ESCALABILIDAD_KIDOO.md`](./PLAN_ESCALABILIDAD_KIDOO.md). «Kidoo» era un nombre en clave y se ha **descartado** por riesgo de marca; el definitivo está por elegir (decisión 087). El plan se aprobó el 2026-10-24 y la fase **K0** está en marcha.

---

## Descripción

En los primeros meses con un bebé hay preguntas que el pediatra siempre hace y que, a las 4 de la madrugada, nadie recuerda: ¿cuándo comió por última vez? ¿De qué pecho? ¿Cuántos pañales mojados lleva hoy? ¿Cuánto ha dormido? Y cuando cuidan varias personas, la pregunta se multiplica: ¿ya le diste tú el biberón?

Kidoo es un registro rápido pensado para usarse **con una mano, con poca luz y medio dormido**, compartido por toda la familia: lo que registra un cuidador aparece al instante en el móvil de los demás. Sobre esa base fiable, Kidoo añade lo que hace falta para entender los datos, sin interpretarlos médicamente:
- percentiles de crecimiento de la OMS;
- un informe para el pediatra;
- predicción de ventanas de sueño;
- un asistente IA que registra por texto o voz con tu confirmación.

### Principios de producto

1. **Registrar en ≤ 3 toques** desde la pantalla de inicio las acciones frecuentes (toma, pañal, sueño). Con voz o texto libre, en uno.
2. **Una mano, poca luz:** botones grandes, acciones principales al alcance del pulgar y modo oscuro desde el primer día.
3. **Valores por defecto inteligentes:** hora = ahora, sugerir el pecho contrario al último, recordar la última cantidad de biberón.
4. **Pantallas simples en lugar de modales:** cada formulario es una pantalla propia con su botón "Atrás".
5. **Una sola verdad, en todos los móviles:** los datos viven en la nube y se sincronizan en tiempo real entre todos los dispositivos de la familia.
6. **Privacidad europea por diseño:** datos y cómputo en la UE, aislamiento estricto entre familias en la base de datos, IA solo con consentimiento y sin entrenamiento con tus datos.
7. **Nunca un diagnóstico:** Kidoo registra, resume y compara con referencias. Ante cualquier duda, el pediatra.

### Funcionalidades

| Módulo | Qué hace | Estado |
|---|---|---|
| **Familia y acceso** | Login con email y código, crear familia y bebé (asistente en dos pasos), invitar con código de un solo uso, expulsar, salir y eliminar la familia | ✅ En producción |
| **Alimentación** | Pecho izq./der. con cronómetro compartido y pecho sugerido; biberón con ml y tipo de leche | ✅ En producción |
| **Pañales** | Mojado / sucio / mixto en un toque; color y textura de las heces | ✅ En producción |
| **Sueño** | Cronómetro compartido, inicio tardío («hace 10 min») y entrada manual | ✅ En producción |
| **Crecimiento** | Peso, longitud y perímetro craneal con la variación de peso | ✅ En producción |
| **Salud** | Vacunas y medicamentos con dosis y reacciones; repetir un medicamento en un toque | ✅ En producción |
| **Hoy** | Última toma, totales del día, cronómetros activos, navegación entre días | ✅ En producción |
| **Sincronización y PWA** | Tiempo real entre dispositivos; instalable en iOS y Android; página sin conexión | ✅ En producción |
| **Idiomas** | Español e inglés en la primera versión; unidades métricas o imperiales | 📐 K1 |
| **Multi-tenant** | Varias familias por usuario, roles (propietario, miembro, cuidador, solo lectura), aislamiento por RLS en el servidor | 📐 K2 |
| **Chat familiar** | Mensajes entre los cuidadores de la familia, en tiempo real | 📐 K3 |
| **Percentiles OMS** | Curvas de crecimiento con edad corregida para prematuros | 📐 K4 |
| **Informe para el pediatra** | PDF del periodo y enlace temporal para compartir | 📐 K5 |
| **Asistente IA** | Registro por texto natural y preguntas sobre los datos del bebé, con confirmación | 📐 K6 |
| **Voz** | Registro dictado, a una mano | 📐 K7 |
| **Predicción de sueño** | Ventana sugerida para la próxima siesta, explicada | 📐 K8 |
| **Planes** | Freemium: el registro y la sincronización son gratis | 📐 K9 |

> **Aviso:** Kidoo es una herramienta de registro. No ofrece consejo médico ni diagnostica. Ante cualquier duda, consulta con tu pediatra.

---

## Aspectos técnicos destacados

- **Concurrencia resuelta en la base de datos:** dos cuidadores pueden iniciar la misma siesta a la vez y solo se crea una (índice único parcial). Las paradas son idempotentes y los dobles toques no duplican nada (UUID generado en el cliente). Todo está probado con colisiones reales contra Postgres.
- **Tiempo real sin fugas:** un *trigger* envía por un canal **privado** de Broadcast solo `{table, op}`, y cada dispositivo vuelve a leer del servidor. Se descartó `postgres_changes` porque sus `DELETE` llegaban a cualquier cuenta (decisión 066).
- **Seguridad en capas:** autorización en el servidor en cada query y action, RLS en todas las tablas y Data API desactivada. En la fase K2, RLS también para las consultas del servidor (`SET LOCAL ROLE` por transacción).
- **Fechas correctas en cualquier zona:** UTC en la BD, «hoy» calculado en la zona de la familia y sesiones que cruzan la medianoche repartidas entre los dos días.
- **PWA sin riesgos:** *service worker* manual que nunca guarda datos de la familia; instalable en iOS y Android.
- **Calidad medible:** TypeScript estricto, 545 tests (integración contra Postgres real), pruebas de mutación de cada barrera de seguridad, WCAG AA comprobado y 85 decisiones de arquitectura documentadas.

---

## Stack tecnológico

| Capa | Tecnología | Estado | Rol |
|---|---|---|---|
| Framework | **Next.js** 16 (App Router, Cache Components) | En uso | Routing, Server Components, Server Actions |
| UI runtime | React 19 | En uso | `useTransition`, `useOptimistic` |
| Lenguaje | **TypeScript** (modo estricto) | En uso | Tipado de extremo a extremo |
| Estilos y componentes | **Tailwind CSS** 4 + **shadcn/ui** (Base UI) | En uso | Tokens de diseño en CSS, componentes accesibles |
| Base de datos | **Supabase PostgreSQL** (eu-west-3) | En uso | Fuente única de verdad |
| ORM | **Prisma** 7 + `@prisma/adapter-pg` | En uso | Esquema, migraciones y cliente tipado |
| Autenticación | Supabase Auth + `@supabase/ssr` | En uso | OTP por email, sesión en cookies |
| Tiempo real | Supabase Realtime (Broadcast privado) | En uso | Señal de cambios por familia |
| Validación y formularios | **Zod** 4, React Hook Form | En uso | Esquemas compartidos cliente/servidor |
| Fechas | date-fns + `@date-fns/tz` | En uso | Días en la zona horaria de la familia |
| Tests | Vitest | En uso | Unit + integración contra Postgres real |
| Hosting | Vercel (`cdg1`, París) | En uso | Funciones en la UE |
| CI/CD | GitHub Actions | 📐 K0 | CI en cada PR, migraciones staging → producción |
| i18n | `next-intl` | 📐 K1 | Mensajes ICU por idioma, sin prefijo en las rutas |
| Almacenamiento | Supabase Storage | 📐 K5 | Informes PDF privados |
| PDF | `@react-pdf/renderer` | 📐 K5 | Informe para el pediatra |
| IA | Vercel AI SDK + **Gemini en Vertex AI (UE)** | 📐 K6 | Salida estructurada, herramientas de solo lectura |
| Vectores | `pgvector` | 📐 K6 | Corpus de guías curado |
| Pagos | Por decidir (recomendado Stripe) | 📐 K9 | Suscripciones por familia |

Requisito: **Node.js 24 LTS**. Prisma se fija en **7.x estable**: el tag `latest` de npm apunta a una RC de Prisma 8. Las versiones de las dependencias nuevas se verifican al instalarlas.

---

## Arquitectura

**Hoy (MVP en producción):**

```
  Móvil A / Móvil B (PWA)            Servidor Next.js (Vercel, UE)       Supabase (UE)
  ───────────────────────            ─────────────────────────────       ─────────────
  Client Components                  Server Actions                      PostgreSQL
  (formularios, cronómetros) ──────▶ auth → Zod → Prisma ───────────▶   (fuente de verdad, RLS)
           ▲                         Server Components   DATABASE_URL        │ triggers
           │ HTML/RSC ◀──────────── queries (Prisma)     pooler :6543        ▼
  RealtimeSync ◀──── WebSocket privado household:<id> ◀──────────── Realtime Broadcast ({table, op})
  (router.refresh())
```

**Kidoo (objetivo):**
- RLS aplicada también a las consultas del servidor (`withTenant` + rol `app_tenant`);
- `next-intl`;
- chat sobre el mismo canal privado;
- asistente con Gemini en Vertex AI (UE), con herramientas de solo lectura y confirmación humana;
- informes en Storage privado con enlaces firmados;
- CI/CD con staging.

El diagrama completo está en [`PLAN_ESCALABILIDAD_KIDOO.md` §5](./PLAN_ESCALABILIDAD_KIDOO.md#5-arquitectura-objetivo).

**Principios:**
- **Lecturas:** Server Components con Prisma, a través de `features/<módulo>/queries.ts`. Sin API REST interna.
- **Escrituras:** Server Actions que comprueban la sesión, la familia y el rol, validan con Zod, escriben, revalidan y devuelven un `ActionResult<T>` tipado. Ni el cliente ni la IA escriben directamente.
- **Sincronización:** Realtime es solo una señal de «hay cambios». Cada dispositivo vuelve a leer del servidor, y ningún dato de salud viaja por el socket.
- **Seguridad:** autorización en el servidor en cada query y action, RLS en todas las tablas, Data API desactivada y datos en la UE.

Las reglas detalladas de arquitectura, código y diseño están en [`CLAUDE.md`](./CLAUDE.md), y las decisiones en [`docs/architecture/decisions.md`](./docs/architecture/decisions.md).

---

## Modelo de datos

Modelos Prisma en PascalCase mapeados a tablas y columnas en snake_case (`feedings.baby_id`). IDs `uuid` (generados en el cliente para que las altas sean idempotentes), fechas `timestamptz` (UTC) y medidas como **enteros con la unidad en el nombre**.

| Modelo | Campos principales | Estado |
|---|---|---|
| `Household` | `name` (+ `timeZone` en K2) | En uso |
| `HouseholdMember` | `householdId`, `userId`, `role`, `displayName` | En uso (N:M y roles en K2) |
| `HouseholdInvite` | `householdId`, `codeHash`, `expiresAt`, `usedAt?` (+ `role` en K2) | En uso |
| `Baby` | `householdId`, `name`, `birthDate`, `sex?` (+ `gestationalAgeWeeks`, `updatedById` en K2) | En uso |
| `Feeding` · `DiaperChange` · `SleepSession` · `GrowthMeasurement` · `HealthRecord` | Registros del bebé con `babyId`, `createdById`, `updatedById` | En uso |
| `Profile` | `locale`, `measurementSystem` | K1 |
| `HouseholdMessage` · `HouseholdMessageRead` | Chat familiar | K3 |
| `GrowthReferenceLms` | Tablas OMS (L, M, S) | K4 |
| `ReportExport` · `ReportShareLink` | Informes y enlaces | K5 |
| `AiConsent` · `AiUsage` · `AiInteraction` · `KnowledgeChunk` | Asistente IA | K6 |
| `SleepPrediction` | Predicción por lotes (V2) | K8 |
| `Subscription` · `BillingEvent` | Planes | K9 |

Las migraciones previstas (borradores SQL) están en [`PLAN_ESCALABILIDAD_KIDOO.md` §11](./PLAN_ESCALABILIDAD_KIDOO.md#11-migraciones-sql-borradores).

---

## Estructura del proyecto

```
baby-tracker/                    # se renombra con la marca definitiva (K9)
├── prisma/
│   ├── schema.prisma            # Modelos (las URLs van en prisma.config.ts, Prisma 7)
│   ├── migrations/              # SQL de Prisma + RLS, índices parciales, grants y triggers
│   ├── platform/                # supabase-bootstrap.sql (una vez por proyecto, como postgres) y shadow-stubs.sql
│   └── seed.ts                  # Solo dev/staging
├── prisma.config.ts             # DIRECT_URL para la CLI de Prisma
├── public/sw.js                 # Service worker manual (nunca guarda datos de la familia)
├── scripts/                     # BD de tests; verify-db.ts (K0); carga de referencias OMS (K4)
├── src/
│   ├── proxy.ts                 # Refresco de la sesión de Supabase
│   ├── app/                     # Solo routing y composición
│   │   ├── (auth)/              # login/, join/
│   │   ├── (app)/(tabs)/        # Con barra inferior: Hoy, Tomas, Pañales, Sueño, Más…
│   │   ├── (app)/(task)/        # Sin barra: altas, ediciones, invitación…
│   │   ├── offline/             # Página «Sin conexión»
│   │   └── manifest.ts          # Manifiesto de la PWA
│   ├── features/<módulo>/       # schemas · queries · actions · service · labels · components
│   ├── components/              # ui/ (shadcn) · layout/ · shared/
│   ├── i18n/                    # next-intl (K1)
│   ├── lib/                     # supabase/, db.ts, tenant-db.ts (K2), env.ts, dates.ts…
│   └── generated/prisma/        # Cliente Prisma generado (no editar)
├── messages/<locale>/           # Catálogos de mensajes (K1)
├── docs/
│   ├── architecture/decisions.md      # Registro de decisiones (ADR 001–085)
│   └── superpowers/plans/             # Planes detallados de cada fase
├── PLAN_ESCALABILIDAD_KIDOO.md  # Visión técnica y orden de desarrollo de Kidoo
├── CLAUDE.md                    # Reglas para Claude (y para cualquier contribuidor)
├── AGENTS.md                    # Punto de entrada para agentes de código
└── .cursor/rules/               # Reglas para Cursor (apuntan a CLAUDE.md)
```

---

## Roadmap

### MVP «Métricas Bebé» — ✅ terminado (2026-10-07 → 2026-10-12)

| Fase | Contenido | Estado |
|---|---|---|
| 1 · Setup, BD y auth | Next.js 16, Prisma 7 sobre Supabase UE, RLS, login OTP, `requireMember()` | ✅ |
| 2 · Backend | Actions idempotentes, cronómetros seguros ante concurrencia, resumen diario, invitaciones (ADR-043), 337 tests | ✅ |
| 3 · UI/UX | Los cinco módulos, onboarding, ajustes, accesibilidad AA | ✅ 2026-10-09 |
| 4 · Dashboard, sync, PWA y despliegue | «Hoy», Broadcast privado, PWA instalada en iOS y Android, Vercel + Supabase en producción | ✅ 2026-10-12 |

Pendiente del MVP, absorbido por Kidoo:
- [ ] Lighthouse de rendimiento y accesibilidad ≥ 90 en producción (incluye el objetivo de 1,5 s en 4G). → K9
- [ ] Iconos definitivos. → K1 / K9, con la marca

El detalle de cada fase está en los planes de [`docs/superpowers/plans/`](./docs/superpowers/plans/) y en el registro de decisiones 001–072.

### Kidoo — 🚧 en marcha (K0)

Orden estricto; cada fase empieza cuando la anterior cumple su criterio de salida. El detalle está en [`PLAN_ESCALABILIDAD_KIDOO.md` §12](./PLAN_ESCALABILIDAD_KIDOO.md#12-orden-secuencial-estricto-de-desarrollo).

- [ ] **K0 · Fundaciones:** etiqueta `v1.0.0-mvp`, `main` protegida, proyecto **staging**, CI con Postgres efímero, migraciones staging → producción con aprobación, `verify-db`, tests fuera de la instancia de producción.
- [ ] **K1 · i18n y marca:** `next-intl`, `es` + `en`, perfil con idioma y unidades, unidades imperiales, pseudo-idioma de pruebas, nombre e iconos.
- [ ] **K2 · Multi-tenant:** varias familias por usuario, roles, familia activa, zona horaria por familia, **RLS aplicada al servidor** (`withTenant`), suite de aislamiento.
- [ ] **K3 · Chat familiar** (y Web Push opcional).
- [ ] **K4 · Percentiles OMS** con edad corregida.
- [ ] **K5 · Informe PDF** para el pediatra con enlace temporal.
- [ ] **K6 · Asistente IA** por texto (requiere EIPD y DPA aprobados).
- [ ] **K7 · Registro por voz.**
- [ ] **K8 · Predicción de ventanas de sueño.**
- [ ] **K9 · Monetización y lanzamiento:** planes, legal, marca, Lighthouse.

---

## Puesta en marcha

```bash
npm install
cp .env.example .env          # Hoy: datos del proyecto Supabase; desde K0: los de staging
```

1. **Solo la primera vez por proyecto de Supabase:** ejecutar [`prisma/platform/supabase-bootstrap.sql`](./prisma/platform/supabase-bootstrap.sql) como `postgres` (MCP de Supabase o editor SQL). Crea los *helpers* que la migración necesita y que el rol `prisma` no puede crear (decisión 027).
2. Aplicar las migraciones y generar el cliente:

   ```bash
   npx prisma migrate deploy  # Hoy el único proyecto es producción (decisión 068): nunca migrate dev contra él
   ```

3. Datos de ejemplo (**solo dev/staging**; el seed se niega con cualquier otro proyecto):

   ```bash
   SEED_DEV_PROJECT_REF=<ref> SEED_OWNER_USER_ID=<tu-id> npx prisma db seed
   npm run dev                                    # http://localhost:3000
   ```

4. Tests:

   ```bash
   npm run test:db                                # crea y migra la BD de tests
   npm test                                       # unit + integración
   ```

| Variable | De dónde sale (panel de Supabase → botón **Connect**) | Uso |
|---|---|---|
| `DATABASE_URL` | Transaction pooler, puerto **6543**, añadiendo `?pgbouncer=true` | Prisma Client en la app |
| `DIRECT_URL` | Session pooler, puerto **5432** (o conexión directa con IPv6) | Prisma CLI: migraciones y Studio |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto | Auth y Realtime en el cliente |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clave publicable (`sb_publishable_…`) | Auth y Realtime en el cliente |
| `APP_TIMEZONE` | — (por defecto `Europe/Madrid`; desde K2, zona por defecto de las familias nuevas) | Cálculo de "hoy" |
| `DATABASE_CA_CERT` | Database → Settings → SSL configuration (PEM) | Verificación TLS; obligatorio en producción |

| Script | Uso |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` / `npm start` | Build y servidor de producción |
| `npm run typecheck` | `next typegen` + `tsc --noEmit` |
| `npm run lint` / `npm run format` | ESLint / Prettier |
| `npm test` | Vitest: unit + integración |
| `npm run test:unit` / `npm run test:int` | Solo unit (sin red) / solo integración |
| `npm run test:db` | Crea y migra la base de datos de test |

---

## Contribuir

1. Lee [`CLAUDE.md`](./CLAUDE.md) (arquitectura, convenciones, diseño y seguridad) y la fase en curso de [`PLAN_ESCALABILIDAD_KIDOO.md`](./PLAN_ESCALABILIDAD_KIDOO.md).
2. Trabaja en una rama corta (`feat/…`, `fix/…`, `docs/…`, `db/…`), nunca en `main`, que despliega producción.
3. Commits en Conventional Commits, en inglés. Una migración por PR, siempre *expand → migrate → contract*.
4. Si cambias el README, cambia también su versión en inglés (`README.md`) en el mismo commit.
5. Los agentes de código (Claude, Cursor y otros) siguen las mismas reglas: [`AGENTS.md`](./AGENTS.md) y [`.cursor/rules/`](./.cursor/rules/) apuntan a `CLAUDE.md`.
